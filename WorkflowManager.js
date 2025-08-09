#!/usr/bin/env node

/**
 * Unified Workflow Manager for Multi-Project Development
 * Manages sprints, worktrees, and Claude sessions across all projects
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class WorkflowManager {
  constructor() {
    this.basePath = '/Users/kellypellas/DevProjects/dev-dashboard';
    this.projectsFile = path.join(this.basePath, 'projects.json');
    this.projects = {};
    this.activeProject = null;
  }

  async initialize() {
    try {
      const data = await fs.readFile(this.projectsFile, 'utf8');
      const config = JSON.parse(data);
      this.projects = config.projects;
      this.activeProject = config.activeProject;
      console.log(`✅ Loaded ${Object.keys(this.projects).length} projects`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load projects:', error.message);
      return false;
    }
  }

  async selectProject(projectId) {
    if (!this.projects[projectId]) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    this.activeProject = projectId;
    const config = await fs.readFile(this.projectsFile, 'utf8');
    const data = JSON.parse(config);
    data.activeProject = projectId;
    await fs.writeFile(this.projectsFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ Switched to project: ${this.projects[projectId].name}`);
    return this.projects[projectId];
  }

  async getProjectIdeas(projectId) {
    const project = this.projects[projectId];
    if (!project) throw new Error(`Project ${projectId} not found`);
    
    const ideasPath = path.join(project.path, project.files.ideas || '.ideas.json');
    try {
      const data = await fs.readFile(ideasPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // Initialize empty ideas file if doesn't exist
      const emptyIdeas = {
        items: [],
        sprints: {},
        tags: [],
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(ideasPath, JSON.stringify(emptyIdeas, null, 2));
      return emptyIdeas;
    }
  }

  async createSprint(projectId, sprintName, config = {}) {
    const ideas = await this.getProjectIdeas(projectId);
    
    if (!ideas.sprints) ideas.sprints = {};
    
    ideas.sprints[sprintName] = {
      name: sprintName,
      description: config.description || '',
      start: config.start || new Date().toISOString().split('T')[0],
      end: config.end || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      goals: config.goals || [],
      created: new Date().toISOString()
    };
    
    const project = this.projects[projectId];
    const ideasPath = path.join(project.path, project.files.ideas || '.ideas.json');
    await fs.writeFile(ideasPath, JSON.stringify(ideas, null, 2));
    
    console.log(`✅ Created sprint "${sprintName}" for ${project.name}`);
    return ideas.sprints[sprintName];
  }

  async getProjectWorktrees(projectId) {
    const project = this.projects[projectId];
    if (!project) throw new Error(`Project ${projectId} not found`);
    
    try {
      const worktreePath = path.join(project.path, 'worktrees');
      const worktrees = await fs.readdir(worktreePath);
      
      const worktreeData = [];
      for (const wt of worktrees) {
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
            // No config file, use defaults
          }
          
          worktreeData.push({
            name: wt,
            path: wtPath,
            projectId: projectId,
            ...config
          });
        }
      }
      
      return worktreeData;
    } catch (error) {
      console.log(`No worktrees found for ${project.name}`);
      return [];
    }
  }

  async createWorktree(projectId, branchName, config = {}) {
    const project = this.projects[projectId];
    if (!project) throw new Error(`Project ${projectId} not found`);
    
    const worktreePath = path.join(project.path, 'worktrees', branchName);
    
    // Create worktree using git
    try {
      execSync(`cd ${project.path} && git worktree add worktrees/${branchName} -b ${branchName}`, {
        encoding: 'utf8'
      });
      
      // Allocate ports
      const ports = await this.allocatePorts(projectId);
      
      // Save worktree config
      const wtConfig = {
        branchName,
        description: config.description || '',
        frontendPort: ports.frontend,
        backendPort: ports.backend,
        created: new Date().toISOString(),
        projectId: projectId
      };
      
      await fs.writeFile(
        path.join(worktreePath, '.worktree-config.json'),
        JSON.stringify(wtConfig, null, 2)
      );
      
      console.log(`✅ Created worktree "${branchName}" for ${project.name}`);
      console.log(`   Frontend: http://localhost:${ports.frontend}`);
      console.log(`   Backend: http://localhost:${ports.backend}`);
      
      return wtConfig;
    } catch (error) {
      console.error(`❌ Failed to create worktree: ${error.message}`);
      throw error;
    }
  }

  async allocatePorts(projectId) {
    // Get all allocated ports across all projects
    const allocatedPorts = new Set();
    
    for (const [pid, project] of Object.entries(this.projects)) {
      const worktrees = await this.getProjectWorktrees(pid);
      worktrees.forEach(wt => {
        if (wt.frontendPort) allocatedPorts.add(wt.frontendPort);
        if (wt.backendPort) allocatedPorts.add(wt.backendPort);
      });
    }
    
    // Find available ports
    const config = JSON.parse(await fs.readFile(this.projectsFile, 'utf8'));
    const ranges = config.dashboardSettings.portRanges;
    
    let frontend = null;
    let backend = null;
    
    for (let p = ranges.frontend[0]; p <= ranges.frontend[1]; p++) {
      if (!allocatedPorts.has(p)) {
        frontend = p;
        break;
      }
    }
    
    for (let p = ranges.backend[0]; p <= ranges.backend[1]; p++) {
      if (!allocatedPorts.has(p)) {
        backend = p;
        break;
      }
    }
    
    if (!frontend || !backend) {
      throw new Error('No available ports in configured ranges');
    }
    
    return { frontend, backend };
  }

  async createSession(projectId, sprintName, worktreeName) {
    const project = this.projects[projectId];
    const ideas = await this.getProjectIdeas(projectId);
    const sprint = ideas.sprints?.[sprintName];
    
    if (!sprint) throw new Error(`Sprint ${sprintName} not found`);
    
    const sprintItems = ideas.items?.filter(item => 
      item.sprint === sprintName && item.status !== 'done'
    ) || [];
    
    // Find worktree config
    const worktrees = await this.getProjectWorktrees(projectId);
    const worktree = worktrees.find(wt => wt.name === worktreeName);
    
    if (!worktree) throw new Error(`Worktree ${worktreeName} not found`);
    
    // Generate session ID
    const sessionId = `DS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create session data
    const session = {
      sessionId,
      projectId,
      projectName: project.name,
      sprintName,
      worktreeName,
      items: sprintItems,
      worktree: {
        path: worktree.path,
        frontendPort: worktree.frontendPort,
        backendPort: worktree.backendPort
      },
      status: 'ready',
      created: new Date().toISOString()
    };
    
    // Save session
    const sessionPath = path.join(this.basePath, 'sessions', `${sessionId}.json`);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    
    // Generate prompt
    const prompt = await this.generateSessionPrompt(session);
    const promptPath = path.join(this.basePath, 'sessions', `${sessionId}-prompt.md`);
    await fs.writeFile(promptPath, prompt);
    
    console.log(`✅ Created session ${sessionId}`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Sprint: ${sprintName}`);
    console.log(`   Items: ${sprintItems.length}`);
    console.log(`   Prompt: ${promptPath}`);
    
    return { session, promptPath };
  }

  async generateSessionPrompt(session) {
    const project = this.projects[session.projectId];
    
    // Load project-specific context if available
    let projectContext = '';
    if (project.files.claude) {
      try {
        const claudePath = path.join(project.path, project.files.claude);
        projectContext = await fs.readFile(claudePath, 'utf8');
      } catch (e) {
        // No CLAUDE.md file
      }
    }
    
    const prompt = `# Development Session: ${session.projectName} - ${session.sprintName}

## Session Information
- **Session ID**: ${session.sessionId}
- **Project**: ${session.projectName}
- **Sprint**: ${session.sprintName}
- **Worktree**: ${session.worktreeName}
- **Created**: ${new Date(session.created).toLocaleString()}

## Environment Setup

### Working Directory
\`\`\`bash
cd ${session.worktree.path}
\`\`\`

### Development Servers
\`\`\`bash
# Frontend (port ${session.worktree.frontendPort})
npm run dev -- --port ${session.worktree.frontendPort}

# Backend (port ${session.worktree.backendPort})
PORT=${session.worktree.backendPort} npm run server
\`\`\`

### Access URLs
- Frontend: http://localhost:${session.worktree.frontendPort}
- Backend: http://localhost:${session.worktree.backendPort}

## Sprint Items (${session.items.length} items)

${session.items.map((item, i) => `
### ${i + 1}. ${item.title} [${item.id}]
- **Type**: ${item.type}
- **Priority**: ${item.priority}
- **Status**: ${item.status}

**Description**:
${item.description}

${item.acceptanceCriteria ? `**Acceptance Criteria**:
${item.acceptanceCriteria}` : ''}

---`).join('\n')}

## Project Context

${projectContext ? `### Project-Specific Guidelines
${projectContext}` : ''}

## Session Workflow

### Starting Work
1. Verify git status is clean
2. Create feature branch if needed
3. Start development servers
4. Test current functionality baseline

### During Development
- Make atomic commits for each meaningful change
- Run tests frequently: \`${project.settings.testCommand || 'npm test'}\`
- Check lint: \`${project.settings.lintCommand || 'npm run lint'}\`
- Update item status as you progress

### Completing Session
1. Run all tests and ensure passing
2. Run lint and fix issues
3. Commit all changes with clear messages
4. Update sprint items status to 'done'
5. Document any new issues discovered
6. Create session completion notes

## Session Completion Checklist
- [ ] All assigned items completed or documented
- [ ] Tests passing
- [ ] Lint checks passing
- [ ] Code committed with meaningful messages
- [ ] No uncommitted changes
- [ ] Sprint items updated in .ideas.json
- [ ] Session notes created

## Notes
_Add session notes here as you work..._

---
*Session generated by Dev Dashboard at ${new Date().toISOString()}*
`;

    return prompt;
  }

  async completeSession(sessionId, completionData = {}) {
    const sessionPath = path.join(this.basePath, 'sessions', `${sessionId}.json`);
    const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf8'));
    
    // Update session status
    sessionData.status = 'completed';
    sessionData.completed = new Date().toISOString();
    sessionData.completionData = completionData;
    
    // Update items in project's ideas.json
    const project = this.projects[sessionData.projectId];
    const ideas = await this.getProjectIdeas(sessionData.projectId);
    
    if (completionData.completedItems) {
      ideas.items = ideas.items.map(item => {
        if (completionData.completedItems.includes(item.id)) {
          return {
            ...item,
            status: 'done',
            completed: new Date().toISOString(),
            completedInSession: sessionId
          };
        }
        return item;
      });
      
      // Save updated ideas
      const ideasPath = path.join(project.path, project.files.ideas || '.ideas.json');
      await fs.writeFile(ideasPath, JSON.stringify(ideas, null, 2));
    }
    
    // Save updated session
    await fs.writeFile(sessionPath, JSON.stringify(sessionData, null, 2));
    
    // Generate completion report
    const report = this.generateCompletionReport(sessionData);
    const reportPath = path.join(this.basePath, 'sessions', `${sessionId}-completion.md`);
    await fs.writeFile(reportPath, report);
    
    console.log(`✅ Session ${sessionId} completed`);
    console.log(`   Completed items: ${completionData.completedItems?.length || 0}`);
    console.log(`   Report: ${reportPath}`);
    
    return { sessionData, reportPath };
  }

  generateCompletionReport(session) {
    const completed = session.completionData.completedItems || [];
    const notes = session.completionData.notes || '';
    
    return `# Session Completion Report

## Session: ${session.sessionId}
- **Project**: ${session.projectName}
- **Sprint**: ${session.sprintName}
- **Duration**: ${this.calculateDuration(session.created, session.completed)}
- **Status**: ✅ Completed

## Completed Items (${completed.length}/${session.items.length})
${completed.map(id => {
  const item = session.items.find(i => i.id === id);
  return item ? `- ✅ ${item.title} [${item.id}]` : `- ✅ ${id}`;
}).join('\n')}

## Remaining Items (${session.items.length - completed.length})
${session.items.filter(item => !completed.includes(item.id))
  .map(item => `- ⏳ ${item.title} [${item.id}]`)
  .join('\n')}

## Session Notes
${notes}

## Git Status
${session.completionData.gitStatus || 'Not captured'}

## Verification
- Tests: ${session.completionData.testsPass ? '✅ Passing' : '❌ Failed'}
- Lint: ${session.completionData.lintPass ? '✅ Clean' : '⚠️ Issues'}
- Build: ${session.completionData.buildPass ? '✅ Success' : '❌ Failed'}

---
*Report generated at ${new Date().toISOString()}*
`;
  }

  calculateDuration(start, end) {
    const ms = new Date(end) - new Date(start);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  async listSessions(projectId = null) {
    const sessionsPath = path.join(this.basePath, 'sessions');
    const files = await fs.readdir(sessionsPath);
    const sessions = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('-')) {
        const data = JSON.parse(await fs.readFile(path.join(sessionsPath, file), 'utf8'));
        if (!projectId || data.projectId === projectId) {
          sessions.push({
            sessionId: data.sessionId,
            project: data.projectName,
            sprint: data.sprintName,
            status: data.status,
            items: data.items.length,
            created: data.created
          });
        }
      }
    }
    
    return sessions.sort((a, b) => new Date(b.created) - new Date(a.created));
  }
}

// CLI Interface
async function main() {
  const manager = new WorkflowManager();
  await manager.initialize();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  try {
    switch (command) {
      case 'list-projects':
        console.log('\n📁 Available Projects:');
        Object.entries(manager.projects).forEach(([id, project]) => {
          console.log(`  ${project.icon} ${project.name} (${id})${id === manager.activeProject ? ' ⭐' : ''}`);
          console.log(`     Path: ${project.path}`);
        });
        break;
        
      case 'select':
        await manager.selectProject(args[0]);
        break;
        
      case 'create-sprint':
        await manager.createSprint(args[0] || manager.activeProject, args[1]);
        break;
        
      case 'create-worktree':
        await manager.createWorktree(args[0] || manager.activeProject, args[1]);
        break;
        
      case 'create-session':
        await manager.createSession(args[0] || manager.activeProject, args[1], args[2]);
        break;
        
      case 'list-sessions':
        const sessions = await manager.listSessions(args[0]);
        console.log('\n📋 Sessions:');
        sessions.forEach(s => {
          console.log(`  ${s.sessionId}`);
          console.log(`    Project: ${s.project} | Sprint: ${s.sprint}`);
          console.log(`    Status: ${s.status} | Items: ${s.items}`);
          console.log(`    Created: ${new Date(s.created).toLocaleString()}`);
        });
        break;
        
      default:
        console.log(`
Dev Dashboard Workflow Manager

Usage:
  node WorkflowManager.js <command> [args]

Commands:
  list-projects                    List all projects
  select <projectId>               Select active project
  create-sprint <project> <name>   Create a new sprint
  create-worktree <project> <name> Create a new worktree
  create-session <project> <sprint> <worktree> Create a session
  list-sessions [projectId]        List all sessions

Examples:
  node WorkflowManager.js list-projects
  node WorkflowManager.js select moseymail
  node WorkflowManager.js create-sprint moseymail "Sprint 1"
  node WorkflowManager.js create-worktree moseymail "feature/auth"
  node WorkflowManager.js create-session moseymail "Sprint 1" "feature/auth"
`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = WorkflowManager;