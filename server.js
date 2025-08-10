const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = 9000;

// Helper function to check if port is in use
async function isPortInUse(port) {
  try {
    const { stdout } = await execPromise(`lsof -ti:${port} | wc -l`);
    const count = parseInt(stdout.trim());
    return count > 0;
  } catch (error) {
    return false;
  }
}

// Helper function to find available port
async function findAvailablePort(basePort, maxAttempts = 20) {
  let port = basePort;
  for (let i = 0; i < maxAttempts; i++) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
    port++;
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${basePort}`);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Load projects configuration
async function loadProjects() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'projects.json'), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading projects:', error);
    return { projects: {}, activeProject: null };
  }
}

// Save projects configuration
async function saveProjects(data) {
  await fs.writeFile(
    path.join(__dirname, 'projects.json'),
    JSON.stringify(data, null, 2)
  );
}

// API Routes

// Create new project
app.post('/api/projects/create', async (req, res) => {
  try {
    const { id, name, description, icon, location = 'new', path: projectPath, gitInit, github } = req.body;
    
    // Load existing projects
    const projectsData = await loadProjects();
    
    // Check if project already exists
    if (projectsData.projects[id]) {
      return res.status(400).json({ message: 'Project with this ID already exists' });
    }
    
    // Set the actual project path
    const actualProjectPath = projectPath || path.join('/Users/kellypellas/DevProjects', id);
    
    // Create or verify project directory
    try {
      await fs.access(actualProjectPath);
      // Directory exists, which is fine for both 'new' and 'existing' locations
      console.log(`Using existing directory: ${actualProjectPath}`);
    } catch {
      // Directory doesn't exist
      if (location === 'new') {
        // Create it if we're supposed to create a new one
        try {
          await fs.mkdir(actualProjectPath, { recursive: true });
          console.log(`Created new directory: ${actualProjectPath}`);
        } catch (error) {
          return res.status(500).json({ message: `Failed to create directory: ${error.message}` });
        }
      } else {
        // For existing location, the directory must exist
        return res.status(400).json({ message: 'Specified directory does not exist' });
      }
    }
    
    // Initialize git if requested
    if (gitInit) {
      try {
        const { execSync } = require('child_process');
        
        // Initialize git repository
        execSync('git init', { cwd: actualProjectPath });
        
        // Create initial .gitignore
        const gitignoreContent = `node_modules/
.env
.DS_Store
*.log
dist/
build/
.ideas.json
.workflow-state.json
`;
        await fs.writeFile(path.join(actualProjectPath, '.gitignore'), gitignoreContent);
        
        // Create initial README
        const readmeContent = `# ${name}

${description}

## Setup

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`;
        await fs.writeFile(path.join(actualProjectPath, 'README.md'), readmeContent);
        
        // Create package.json if it doesn't exist
        const packageJsonPath = path.join(actualProjectPath, 'package.json');
        try {
          await fs.access(packageJsonPath);
        } catch {
          const packageJson = {
            name: id,
            version: "1.0.0",
            description: description,
            main: "index.js",
            scripts: {
              dev: "echo 'Configure your dev script'",
              test: "echo 'Configure your test script'",
              lint: "echo 'Configure your lint script'"
            }
          };
          await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
        }
        
        // Initial commit
        execSync('git add .', { cwd: actualProjectPath });
        execSync('git commit -m "Initial commit"', { cwd: actualProjectPath });
        
        // Create GitHub repository if requested
        let githubUrl = null;
        if (github) {
          try {
            // Create GitHub repo using gh CLI
            const visibility = github.visibility === 'public' ? '--public' : '--private';
            const repoName = github.repo;
            
            // Create the repository
            execSync(`gh repo create ${github.username}/${repoName} ${visibility} --source="${actualProjectPath}" --remote=origin --push`, {
              cwd: actualProjectPath,
              stdio: 'pipe'
            });
            
            githubUrl = `https://github.com/${github.username}/${repoName}`;
          } catch (ghError) {
            console.error('GitHub creation error:', ghError.message);
            // Continue even if GitHub creation fails
          }
        }
        
      } catch (gitError) {
        console.error('Git initialization error:', gitError.message);
        return res.status(500).json({ message: `Git initialization failed: ${gitError.message}` });
      }
    }
    
    // Create .ideas.json file
    const ideasJson = {
      items: [],
      sprints: {},
      lastId: 0
    };
    await fs.writeFile(path.join(actualProjectPath, '.ideas.json'), JSON.stringify(ideasJson, null, 2));
    
    // Add project to projects.json
    projectsData.projects[id] = {
      id,
      name,
      description,
      path: actualProjectPath,
      repository: id,
      primaryColor: "#3B82F6",
      icon,
      settings: {
        apiPort: 3000 + Object.keys(projectsData.projects).length + 1,
        frontendPort: 5173 + Object.keys(projectsData.projects).length,
        gitEnabled: gitInit,
        worktreesEnabled: gitInit,
        devCommand: "npm run dev",
        testCommand: "npm test",
        lintCommand: "npm run lint"
      },
      files: {
        ideas: ".ideas.json",
        claude: null,
        currentState: null
      },
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    // Set as active project
    projectsData.activeProject = id;
    
    // Save updated projects
    await saveProjects(projectsData);
    
    res.json({ 
      success: true, 
      project: projectsData.projects[id],
      githubUrl: github ? `https://github.com/${github.username}/${github.repo}` : null
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  const data = await loadProjects();
  res.json(data);
});

// Select active project
app.post('/api/projects/select', async (req, res) => {
  const { projectId } = req.body;
  const data = await loadProjects();
  
  if (!data.projects[projectId]) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  data.activeProject = projectId;
  data.projects[projectId].lastAccessed = new Date().toISOString();
  await saveProjects(data);
  
  res.json({ success: true, project: data.projects[projectId] });
});

// Get project ideas/issues
app.get('/api/projects/:projectId/ideas', async (req, res) => {
  const { projectId } = req.params;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    const ideasPath = path.join(project.path, project.files.ideas || '.ideas.json');
    const ideasData = await fs.readFile(ideasPath, 'utf8');
    res.json(JSON.parse(ideasData));
  } catch (error) {
    // Return empty structure if file doesn't exist
    res.json({
      items: [],
      sprints: {},
      tags: [],
      lastUpdated: new Date().toISOString()
    });
  }
});

// Save project ideas
app.post('/api/projects/:projectId/ideas', async (req, res) => {
  const { projectId } = req.params;
  const ideas = req.body;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    const ideasPath = path.join(project.path, project.files.ideas || '.ideas.json');
    await fs.writeFile(ideasPath, JSON.stringify(ideas, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project worktrees
app.get('/api/projects/:projectId/worktrees', async (req, res) => {
  const { projectId } = req.params;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    // First, get list of actual git worktrees
    const { stdout: gitWorktreeList } = await execPromise(`cd ${project.path} && git worktree list`);
    const registeredWorktrees = gitWorktreeList.split('\n')
      .filter(line => line.includes('/worktrees/'))
      .map(line => {
        const match = line.match(/worktrees\/([^\s]+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
    
    const worktreePath = path.join(project.path, 'worktrees');
    
    // Check if worktrees directory exists
    try {
      await fs.access(worktreePath);
    } catch {
      // No worktrees directory
      return res.json([]);
    }
    
    const directories = await fs.readdir(worktreePath);
    
    const worktreeData = [];
    for (const wt of directories) {
      // Skip directories that aren't registered git worktrees
      // (these are orphaned directories)
      if (!registeredWorktrees.includes(wt)) {
        console.log(`Skipping orphaned directory: ${wt} (not a registered git worktree)`);
        // Optionally, clean it up automatically
        const orphanPath = path.join(worktreePath, wt);
        try {
          await fs.rm(orphanPath, { recursive: true, force: true });
          console.log(`Cleaned up orphaned directory: ${orphanPath}`);
        } catch (cleanupError) {
          console.error(`Failed to clean up orphaned directory ${orphanPath}:`, cleanupError);
        }
        continue;
      }
      
      const wtPath = path.join(worktreePath, wt);
      const stat = await fs.stat(wtPath);
      if (stat.isDirectory()) {
        // Try to get worktree config if exists
        let config = {};
        try {
          const configPath = path.join(wtPath, '.worktree-config.json');
          const configData = await fs.readFile(configPath, 'utf8');
          config = JSON.parse(configData);
        } catch (e) {
          // No config file
        }
        
        // Check git status for uncommitted changes
        let gitStatus = {};
        try {
          const statusOutput = await execPromise(`cd ${wtPath} && git status --porcelain`);
          const statusLines = statusOutput.stdout.trim().split('\n').filter(Boolean);
          const modifiedFiles = statusLines.map(line => ({
            status: line.substring(0, 2).trim(),
            path: line.substring(3)
          }));
          
          const lastCommit = await execPromise(`cd ${wtPath} && git log -1 --format="%h %s" 2>/dev/null`).catch(() => ({ stdout: '' }));
          const branch = await execPromise(`cd ${wtPath} && git branch --show-current`).catch(() => ({ stdout: wt }));
          
          gitStatus = {
            hasChanges: statusLines.length > 0,
            uncommittedChanges: statusLines.length,
            modifiedFiles: modifiedFiles.slice(0, 10),
            lastCommit: lastCommit.stdout.trim(),
            branch: branch.stdout.trim() || wt
          };
        } catch (error) {
          gitStatus = { error: 'Could not get git status' };
        }
        
        // Check if ports are in use
        // If no config exists, find available ports dynamically
        let frontendPort = config.frontendPort;
        let backendPort = config.backendPort;
        
        if (!frontendPort || !backendPort) {
          // No config or missing ports - allocate dynamically
          frontendPort = await findAvailablePort(5173);
          backendPort = await findAvailablePort(3001);
          
          // Save the allocated ports to config
          const newConfig = {
            ...config,
            frontendPort,
            backendPort
          };
          try {
            const configPath = path.join(wtPath, '.worktree-config.json');
            await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
          } catch (e) {
            console.error('Failed to save worktree config:', e);
          }
        }
        
        let frontendPortInUse = false;
        let backendPortInUse = false;
        
        try {
          const frontendCheck = await execPromise(`lsof -ti:${frontendPort} | wc -l`);
          frontendPortInUse = parseInt(frontendCheck.stdout.trim()) > 0;
        } catch (e) {
          frontendPortInUse = false;
        }
        
        try {
          const backendCheck = await execPromise(`lsof -ti:${backendPort} | wc -l`);
          backendPortInUse = parseInt(backendCheck.stdout.trim()) > 0;
        } catch (e) {
          backendPortInUse = false;
        }
        
        worktreeData.push({
          name: wt,
          path: wtPath,
          frontendPort,
          backendPort,
          frontendPortInUse,
          backendPortInUse,
          gitStatus,
          ...config
        });
      }
    }
    
    res.json(worktreeData);
  } catch (error) {
    res.json([]);
  }
});

// Create worktree
app.post('/api/projects/:projectId/worktrees', async (req, res) => {
  const { projectId } = req.params;
  const { branchName, description } = req.body;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    // Create worktree
    await execPromise(
      `cd ${project.path} && git worktree add worktrees/${branchName} -b ${branchName}`
    );
    
    // Allocate ports - find available ones dynamically
    const frontendPort = await findAvailablePort(5173);
    const backendPort = await findAvailablePort(3001);
    
    // Save config
    const config = {
      branchName,
      description,
      frontendPort,
      backendPort,
      created: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(project.path, 'worktrees', branchName, '.worktree-config.json'),
      JSON.stringify(config, null, 2)
    );
    
    res.json({ success: true, worktree: config });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Archive (remove) worktree
app.delete('/api/projects/:projectId/worktrees/:worktreeName', async (req, res) => {
  const { projectId, worktreeName } = req.params;
  const { force } = req.query;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const worktreePath = path.join(project.path, 'worktrees', worktreeName);
  
  try {
    // First, try to remove via git worktree command
    const forceFlag = force === 'true' ? '--force' : '';
    try {
      await execPromise(`cd ${project.path} && git worktree remove ${forceFlag} worktrees/${worktreeName}`);
    } catch (gitError) {
      console.log(`Git worktree remove failed: ${gitError.message}, will try direct cleanup`);
      
      // If git worktree remove fails, check if it's because it's not a registered worktree
      const { stdout: worktreeList } = await execPromise(`cd ${project.path} && git worktree list`);
      const isRegistered = worktreeList.includes(`worktrees/${worktreeName}`);
      
      if (!isRegistered) {
        console.log(`${worktreeName} is not a registered git worktree, removing directory directly`);
      } else if (!force) {
        // It's registered but couldn't be removed (probably dirty), and force wasn't requested
        throw gitError;
      }
    }
    
    // Check if directory still exists and remove it if needed
    if (await fs.access(worktreePath).then(() => true).catch(() => false)) {
      console.log(`Directory still exists at ${worktreePath}, removing it`);
      await fs.rm(worktreePath, { recursive: true, force: true });
    }
    
    res.json({ success: true, message: `Worktree ${worktreeName} archived successfully` });
  } catch (error) {
    console.error('Worktree removal error:', error);
    // Provide helpful error message
    if (error.message.includes('is dirty')) {
      res.status(400).json({ 
        error: 'Worktree has uncommitted changes. Commit or stash changes first, or use force delete option.',
        details: error.message 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessionsPath = path.join(__dirname, 'sessions');
    await fs.mkdir(sessionsPath, { recursive: true });
    
    const files = await fs.readdir(sessionsPath);
    const sessions = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.endsWith('-prompt.json')) {
        const data = JSON.parse(
          await fs.readFile(path.join(sessionsPath, file), 'utf8')
        );
        // Try to get git status for the worktree
        let gitStatus = {};
        if (data.worktree?.path) {
          try {
            const statusOutput = await execPromise(`cd ${data.worktree.path} && git status --porcelain`);
            const statusLines = statusOutput.stdout.trim().split('\n').filter(Boolean);
            gitStatus = {
              hasChanges: statusLines.length > 0,
              uncommittedChanges: statusLines.length,
              branch: data.worktreeName
            };
          } catch (error) {
            gitStatus = { error: 'Worktree not found or not a git repository' };
          }
        } else {
          gitStatus = { error: 'Worktree path not specified' };
        }
        
        sessions.push({
          sessionId: data.sessionId,
          projectId: data.projectId,
          projectName: data.projectName,
          sprint: data.sprintName,
          worktree: data.worktreeName,
          items: data.items?.length || 0,
          status: data.status,
          state: data.state,
          created: data.created,
          notes: data.notes,
          gitStatus
        });
      }
    }
    
    res.json(sessions.sort((a, b) => new Date(b.created) - new Date(a.created)));
  } catch (error) {
    res.json([]);
  }
});

// Create session
app.post('/api/sessions', async (req, res) => {
  const { projectId, sprintName, worktreeName } = req.body;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    // Load sprint items
    const ideasPath = path.join(project.path, project.files.ideas || '.ideas.json');
    const ideas = JSON.parse(await fs.readFile(ideasPath, 'utf8'));
    const sprintItems = ideas.items?.filter(item => 
      item.sprint === sprintName && item.status !== 'done'
    ) || [];
    
    // Get worktree config
    const wtConfigPath = path.join(project.path, 'worktrees', worktreeName, '.worktree-config.json');
    let worktreeConfig = {};
    try {
      worktreeConfig = JSON.parse(await fs.readFile(wtConfigPath, 'utf8'));
    } catch (e) {
      // Use defaults
      worktreeConfig = {
        frontendPort: 5173,
        backendPort: 3001
      };
    }
    
    // Generate meaningful session ID
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sprintShort = sprintName.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '');
    const sessionId = `${date}-${sprintShort}-${worktreeName.substring(0, 10)}`;
    const session = {
      sessionId,
      projectId,
      projectName: project.name,
      sprintName,
      worktreeName,
      items: sprintItems,
      worktree: {
        path: path.join(project.path, 'worktrees', worktreeName),
        ...worktreeConfig
      },
      status: 'ready',
      created: new Date().toISOString()
    };
    
    // Save session
    const sessionsPath = path.join(__dirname, 'sessions');
    await fs.mkdir(sessionsPath, { recursive: true });
    await fs.writeFile(
      path.join(sessionsPath, `${sessionId}.json`),
      JSON.stringify(session, null, 2)
    );
    
    // Session created - prompt will be generated client-side
    
    res.json({ 
      success: true, 
      session,
      promptFile: `${sessionId}-prompt.md`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get session prompt
app.get('/api/sessions/:sessionId/prompt', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const promptPath = path.join(__dirname, 'sessions', `${sessionId}-prompt.md`);
    const prompt = await fs.readFile(promptPath, 'utf8');
    res.type('text/plain').send(prompt);
  } catch (error) {
    res.status(404).json({ error: 'Prompt not found' });
  }
});

// Save worktree config
app.post('/api/worktree-config', async (req, res) => {
  const { projectPath, worktreeName, config } = req.body;
  
  try {
    const configPath = path.join(actualProjectPath, 'worktrees', worktreeName, '.worktree-config.json');
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update session
app.post('/api/session-update', async (req, res) => {
  const { sessionId, updates } = req.body;
  
  try {
    const sessionPath = path.join(__dirname, 'sessions', `${sessionId}.json`);
    const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf8'));
    
    // Apply updates
    Object.assign(sessionData, updates);
    
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save session prompt (for start/close prompts)
app.post('/api/session-prompt', async (req, res) => {
  const { sessionId, promptType, content } = req.body;
  
  try {
    const sessionsPath = path.join(__dirname, 'sessions');
    await fs.mkdir(sessionsPath, { recursive: true });
    
    const filename = promptType === 'start' 
      ? `${sessionId}-start-prompt.md`
      : promptType === 'close' 
      ? `${sessionId}-close-prompt.md`
      : `${sessionId}-prompt.md`;
    
    await fs.writeFile(
      path.join(sessionsPath, filename),
      content
    );
    
    res.json({ success: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete session
app.delete('/api/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    const sessionsPath = path.join(__dirname, 'sessions');
    
    // Delete session file
    await fs.unlink(path.join(sessionsPath, `${sessionId}.json`));
    
    // Delete prompt file if exists
    try {
      await fs.unlink(path.join(sessionsPath, `${sessionId}-prompt.md`));
    } catch (e) {
      // Prompt file might not exist
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a stale branch with main
// Use * to capture branch names with slashes
app.post('/api/projects/:projectId/branches/*/update', async (req, res) => {
  const { projectId } = req.params;
  // Extract branch name from the URL (handles slashes in branch names)
  const fullPath = req.params[0]; // This captures everything after /branches/
  const branchName = decodeURIComponent(fullPath);
  const { method } = req.body; // 'merge' or 'rebase'
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  if (branchName === 'main' || branchName === 'master') {
    return res.status(400).json({ error: 'Cannot update main branch' });
  }
  
  try {
    // Check if branch exists
    const { stdout: branches } = await execPromise(
      `cd ${project.path} && git branch --list ${branchName}`
    );
    
    if (!branches.trim()) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    
    // Stash any uncommitted changes
    await execPromise(`cd ${project.path} && git stash`);
    
    // Checkout the branch
    await execPromise(`cd ${project.path} && git checkout ${branchName}`);
    
    // Update based on method
    let result;
    if (method === 'rebase') {
      // Rebase onto main
      result = await execPromise(`cd ${project.path} && git rebase main`);
    } else {
      // Merge main into branch
      result = await execPromise(`cd ${project.path} && git merge main --no-edit`);
    }
    
    // Pop stash if there were changes
    try {
      await execPromise(`cd ${project.path} && git stash pop`);
    } catch (e) {
      // No stash to pop
    }
    
    res.json({ 
      success: true, 
      message: `Branch ${branchName} updated with main using ${method}`,
      output: result.stdout
    });
  } catch (error) {
    // Try to abort rebase if it failed
    if (method === 'rebase' && error.message.includes('conflict')) {
      try {
        await execPromise(`cd ${project.path} && git rebase --abort`);
      } catch (e) {
        // Ignore abort errors
      }
    }
    
    res.status(500).json({ 
      error: `Failed to ${method} branch: ${error.message}`,
      hint: error.message.includes('conflict') ? 
        'There are conflicts that need manual resolution' : undefined
    });
  }
});

// Delete a branch
// Use * to capture branch names with slashes
app.delete('/api/projects/:projectId/branches/*', async (req, res) => {
  const { projectId } = req.params;
  // Extract branch name from the URL (handles slashes in branch names)
  const branchName = decodeURIComponent(req.params[0]);
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Don't allow deleting main or master
  if (branchName === 'main' || branchName === 'master') {
    return res.status(400).json({ error: 'Cannot delete main branch' });
  }
  
  try {
    // Check if branch is current
    const { stdout: currentBranch } = await execPromise(
      `cd ${project.path} && git branch --show-current`
    );
    
    if (currentBranch.trim() === branchName) {
      return res.status(400).json({ error: 'Cannot delete current branch' });
    }
    
    // Delete the branch (use -d for safety, only deletes if merged)
    await execPromise(`cd ${project.path} && git branch -d ${branchName}`);
    
    res.json({ success: true, message: `Branch ${branchName} deleted` });
  } catch (error) {
    // If -d fails, the branch might not be merged
    if (error.message.includes('not fully merged')) {
      res.status(400).json({ 
        error: 'Branch is not fully merged. Use force delete if you\'re sure.',
        needsForce: true 
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get project branches
app.get('/api/projects/:projectId/branches', async (req, res) => {
  const { projectId } = req.params;
  const data = await loadProjects();
  const project = data.projects[projectId];
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  try {
    // Get git branches
    const { stdout: branchList } = await execPromise(
      `cd ${project.path} && git branch -a -v --no-abbrev`
    );
    
    // Get current branch
    const { stdout: currentBranch } = await execPromise(
      `cd ${project.path} && git branch --show-current`
    );
    
    // Parse branches
    const branches = [];
    const lines = branchList.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const cleanLine = line.replace(/^\*?\s+/, '');
      const [branchName, commit, ...messageParts] = cleanLine.split(/\s+/);
      
      // Skip empty lines, remote tracking branches, and invalid entries
      if (!branchName || branchName.startsWith('remotes/') || branchName === 'undefined') continue;
      
      // Get more details for each branch
      try {
        // Get last commit date
        const { stdout: lastDate } = await execPromise(
          `cd ${project.path} && git log -1 --format=%ai ${branchName} 2>/dev/null`
        );
        
        // Check for uncommitted changes (only for current branch)
        let uncommittedChanges = 0;
        if (isCurrent) {
          const { stdout: status } = await execPromise(
            `cd ${project.path} && git status --porcelain | wc -l`
          );
          uncommittedChanges = parseInt(status.trim());
        }
        
        // Check for unpushed commits
        let unpushedCommits = 0;
        let tracking = null;
        try {
          const { stdout: trackingInfo } = await execPromise(
            `cd ${project.path} && git rev-parse --abbrev-ref ${branchName}@{upstream} 2>/dev/null`
          );
          tracking = trackingInfo.trim();
          
          if (tracking) {
            const { stdout: ahead } = await execPromise(
              `cd ${project.path} && git rev-list --count ${tracking}..${branchName} 2>/dev/null`
            );
            unpushedCommits = parseInt(ahead.trim());
          }
        } catch (e) {
          // No upstream tracking
        }
        
        // Check if branch is associated with a worktree
        let relatedWorktree = null;
        try {
          const worktreePath = path.join(project.path, 'worktrees');
          const worktrees = await fs.readdir(worktreePath);
          if (worktrees.includes(branchName)) {
            relatedWorktree = branchName;
          }
        } catch (e) {
          // No worktrees
        }
        
        // Check if branch is merged to main
        let isMerged = false;
        let isBehindMain = false;
        let commitsBehind = 0;
        try {
          const { stdout: mergedBranches } = await execPromise(
            `cd ${project.path} && git branch --merged main 2>/dev/null`
          );
          isMerged = mergedBranches.split('\n')
            .map(b => b.trim().replace('* ', ''))
            .includes(branchName);
          
          // Check if branch is behind main
          if (branchName !== 'main') {
            try {
              const { stdout: behind } = await execPromise(
                `cd ${project.path} && git rev-list --count ${branchName}..main 2>/dev/null`
              );
              commitsBehind = parseInt(behind.trim()) || 0;
              isBehindMain = commitsBehind > 0;
            } catch (e) {
              // Can't check behind status
            }
          }
        } catch (e) {
          // Can't check merge status
        }
        
        branches.push({
          name: branchName,
          current: isCurrent,
          lastCommitHash: commit.substring(0, 7),
          lastCommitMessage: messageParts.join(' '),
          lastCommitDate: lastDate.trim(),
          uncommittedChanges,
          unpushedCommits,
          tracking,
          relatedWorktree,
          isMerged,
          isBehindMain,
          commitsBehind,
          isStale: isMerged && isBehindMain && branchName !== 'main',
          status: (isMerged && isBehindMain && branchName !== 'main') ? 'stale' :
                  isMerged ? 'merged' :
                  uncommittedChanges > 0 ? 'wip' : 
                  unpushedCommits > 0 ? 'unpushed' : 
                  'clean'
        });
      } catch (error) {
        // Skip branches with errors
        console.error(`Error processing branch ${branchName}:`, error.message);
      }
    }
    
    res.json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Check if port is in use
app.get('/api/check-port/:port', async (req, res) => {
  const { port } = req.params;
  
  try {
    const { stdout } = await execPromise(`lsof -ti:${port} | wc -l`);
    const count = parseInt(stdout.trim());
    res.json({ 
      port: parseInt(port),
      inUse: count > 0,
      processCount: count
    });
  } catch (error) {
    // If lsof fails, assume port is free
    res.json({ 
      port: parseInt(port),
      inUse: false,
      processCount: 0
    });
  }
});

// Get git status for a worktree
app.get('/api/git-status', async (req, res) => {
  const { worktree } = req.query;
  
  if (!worktree) {
    return res.status(400).json({ error: 'Worktree name required' });
  }
  
  try {
    const data = await loadProjects();
    const projectId = data.activeProject;
    const project = data.projects[projectId];
    
    if (!project) {
      return res.status(404).json({ error: 'No active project' });
    }
    
    const worktreePath = path.join(project.path, 'worktrees', worktree);
    
    // Check git status
    const { stdout: status } = await execPromise(
      `cd ${worktreePath} && git status --porcelain`
    );
    
    // Get current branch
    const { stdout: branch } = await execPromise(
      `cd ${worktreePath} && git branch --show-current`
    );
    
    // Count uncommitted changes
    const changes = status.split('\n').filter(line => line.trim()).length;
    
    res.json({
      worktree,
      branch: branch.trim(),
      uncommittedChanges: changes,
      hasChanges: changes > 0,
      files: status.split('\n').filter(line => line.trim()).map(line => {
        const [status, ...pathParts] = line.trim().split(' ');
        return {
          status: status,
          path: pathParts.join(' ')
        };
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get worktree status with commit info
app.get('/api/worktree-status', async (req, res) => {
  const { worktree } = req.query;
  
  if (!worktree) {
    return res.status(400).json({ error: 'Worktree name required' });
  }
  
  try {
    const data = await loadProjects();
    const projectId = data.activeProject;
    const project = data.projects[projectId];
    
    if (!project) {
      return res.status(404).json({ error: 'No active project' });
    }
    
    const worktreePath = path.join(project.path, 'worktrees', worktree);
    
    // Check if worktree path exists
    try {
      await fs.access(worktreePath);
    } catch (e) {
      // Worktree doesn't exist, try the main project path
      const mainPath = project.path;
      try {
        await fs.access(mainPath);
        // Use main project path as fallback
        const { stdout: commitCount } = await execPromise(
          `cd "${mainPath}" && git log --oneline --since="24 hours ago" 2>/dev/null | wc -l`
        );
        
        const { stdout: lastCommit } = await execPromise(
          `cd "${mainPath}" && git log -1 --pretty=format:"%s" 2>/dev/null || echo "No commits"`
        );
        
        const { stdout: status } = await execPromise(
          `cd "${mainPath}" && git status --porcelain 2>/dev/null | wc -l`
        );
        
        return res.json({
          worktree,
          commitsSinceStart: parseInt(commitCount.trim()) || 0,
          lastCommitMessage: lastCommit.trim() || 'No commits',
          uncommittedChanges: parseInt(status.trim()) || 0,
          usingMainBranch: true
        });
      } catch (mainError) {
        return res.json({
          worktree,
          commitsSinceStart: 0,
          lastCommitMessage: 'Repository not accessible',
          uncommittedChanges: 0,
          error: 'Worktree not found'
        });
      }
    }
    
    // Get commit count since session start (last 24 hours as fallback)
    const { stdout: commitCount } = await execPromise(
      `cd "${worktreePath}" && git log --oneline --since="24 hours ago" 2>/dev/null | wc -l`
    );
    
    // Get last commit message
    const { stdout: lastCommit } = await execPromise(
      `cd "${worktreePath}" && git log -1 --pretty=format:"%s" 2>/dev/null || echo "No commits"`
    );
    
    // Get uncommitted changes
    const { stdout: status } = await execPromise(
      `cd "${worktreePath}" && git status --porcelain 2>/dev/null | wc -l`
    );
    
    res.json({
      worktree,
      commitsSinceStart: parseInt(commitCount.trim()) || 0,
      lastCommitMessage: lastCommit.trim() || 'No commits',
      uncommittedChanges: parseInt(status.trim()) || 0
    });
  } catch (error) {
    // Return safe defaults instead of error
    res.json({
      worktree,
      commitsSinceStart: 0,
      lastCommitMessage: 'Error accessing repository',
      uncommittedChanges: 0,
      error: error.message
    });
  }
});

// Get files changed since a specific time
app.get('/api/git-changes', async (req, res) => {
  const { worktree, since } = req.query;
  
  if (!worktree) {
    return res.status(400).json({ error: 'Worktree name required' });
  }
  
  try {
    const data = await loadProjects();
    const projectId = data.activeProject;
    const project = data.projects[projectId];
    
    if (!project) {
      return res.status(404).json({ error: 'No active project' });
    }
    
    let targetPath = path.join(project.path, 'worktrees', worktree);
    
    // Check if worktree exists, otherwise use main path
    try {
      await fs.access(targetPath);
    } catch (e) {
      targetPath = project.path;
    }
    
    const sinceTime = since || '24 hours ago';
    
    // Get files changed - try multiple approaches
    let files = [];
    try {
      // Try to get recent changes
      const { stdout: recentFiles } = await execPromise(
        `cd "${targetPath}" && git diff --name-only HEAD~5..HEAD 2>/dev/null`
      );
      files = recentFiles.split('\n').filter(f => f.trim());
    } catch (e) {
      // Fallback: try to get staged/unstaged changes
      try {
        const { stdout: changedFiles } = await execPromise(
          `cd "${targetPath}" && git status --porcelain 2>/dev/null | awk '{print $2}'`
        );
        files = changedFiles.split('\n').filter(f => f.trim());
      } catch (e2) {
        // No files found
        files = [];
      }
    }
    
    res.json({
      worktree,
      files: files
    });
  } catch (error) {
    // Return empty list instead of error
    res.json({
      worktree,
      files: [],
      error: error.message
    });
  }
});

// Get branch push status
app.get('/api/branch-status', async (req, res) => {
  const { worktree } = req.query;
  
  if (!worktree) {
    return res.status(400).json({ error: 'Worktree name required' });
  }
  
  try {
    const data = await loadProjects();
    const projectId = data.activeProject;
    const project = data.projects[projectId];
    
    if (!project) {
      return res.status(404).json({ error: 'No active project' });
    }
    
    let targetPath = path.join(project.path, 'worktrees', worktree);
    
    // Check if worktree exists, otherwise use main path
    try {
      await fs.access(targetPath);
    } catch (e) {
      targetPath = project.path;
    }
    
    // Get current branch
    let branch = 'main';
    try {
      const { stdout: currentBranch } = await execPromise(
        `cd "${targetPath}" && git branch --show-current 2>/dev/null`
      );
      branch = currentBranch.trim() || 'main';
    } catch (e) {
      // Default to main
    }
    
    // Check for upstream
    let hasUpstream = false;
    let upstream = '';
    try {
      const { stdout: upstreamInfo } = await execPromise(
        `cd "${targetPath}" && git rev-parse --abbrev-ref @{upstream} 2>/dev/null`
      );
      hasUpstream = true;
      upstream = upstreamInfo.trim();
    } catch (e) {
      // No upstream
    }
    
    // Count unpushed commits
    let unpushedCommits = 0;
    if (hasUpstream) {
      try {
        const { stdout: count } = await execPromise(
          `cd "${targetPath}" && git rev-list --count @{upstream}..HEAD 2>/dev/null`
        );
        unpushedCommits = parseInt(count.trim()) || 0;
      } catch (e) {
        // Error counting
      }
    }
    
    res.json({
      worktree,
      branch: branch,
      hasUpstream,
      upstream,
      unpushedCommits,
      usingMainPath: targetPath === project.path
    });
  } catch (error) {
    // Return safe defaults
    res.json({
      worktree,
      branch: 'unknown',
      hasUpstream: false,
      upstream: '',
      unpushedCommits: 0,
      error: error.message
    });
  }
});

// Session update endpoint
app.post('/api/session-update', async (req, res) => {
  const { sessionId, updates } = req.body;
  
  try {
    const sessionsPath = path.join(__dirname, 'sessions');
    const sessionFile = path.join(sessionsPath, `${sessionId}.json`);
    
    // Load existing session
    let session = {};
    try {
      const data = await fs.readFile(sessionFile, 'utf8');
      session = JSON.parse(data);
    } catch (error) {
      // Session file doesn't exist yet
    }
    
    // Merge updates
    session = { ...session, ...updates, sessionId };
    
    // Save updated session
    await fs.mkdir(sessionsPath, { recursive: true });
    await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
    
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save session prompt
app.post('/api/session-prompt', async (req, res) => {
  const { sessionId, promptType, content } = req.body;
  
  try {
    const sessionsPath = path.join(__dirname, 'sessions');
    await fs.mkdir(sessionsPath, { recursive: true });
    
    const filename = `${sessionId}-${promptType}.md`;
    await fs.writeFile(
      path.join(sessionsPath, filename),
      content
    );
    
    res.json({ success: true, filename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start a server in a worktree
app.post('/api/start-server', async (req, res) => {
  const { worktreeName, worktreePath, serverType, port, command } = req.body;
  
  try {
    // Check if port is already in use
    const inUse = await isPortInUse(port);
    if (inUse) {
      return res.json({ 
        success: false, 
        error: `Port ${port} is already in use` 
      });
    }
    
    // Start the server in the background
    const { exec } = require('child_process');
    const serverProcess = exec(command, {
      cwd: worktreePath,
      detached: true,
      stdio: 'ignore'
    });
    
    // Detach the process so it continues running
    serverProcess.unref();
    
    res.json({ 
      success: true, 
      message: `${serverType} server starting on port ${port}`,
      pid: serverProcess.pid 
    });
  } catch (error) {
    console.error('Error starting server:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Kill a process on a specific port
app.post('/api/kill-port/:port', async (req, res) => {
  const { port } = req.params;
  
  try {
    // Find and kill processes on the port
    const { stdout } = await execPromise(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(Boolean);
    
    if (pids.length > 0) {
      for (const pid of pids) {
        await execPromise(`kill -9 ${pid}`);
      }
      res.json({ success: true, message: `Killed ${pids.length} process(es) on port ${port}` });
    } else {
      res.json({ success: true, message: `No processes found on port ${port}` });
    }
  } catch (error) {
    // lsof returns error if no process found, which is OK
    res.json({ success: true, message: `Port ${port} is now free` });
  }
});

// Serve dashboard HTML
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║     Dev Dashboard Server Started!              ║
╠════════════════════════════════════════════════╣
║  🚀 Dashboard: http://localhost:${PORT}           ║
║  📡 API:       http://localhost:${PORT}/api       ║
║                                                ║
║  Ready to manage your projects!                ║
╚════════════════════════════════════════════════╝
  `);
});