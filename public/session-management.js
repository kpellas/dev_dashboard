// Enhanced Session Management with comprehensive workflow tracking

// Ensure global variables are available
if (typeof sessions === 'undefined') window.sessions = [];
if (typeof activeProject === 'undefined') window.activeProject = null;
if (typeof projects === 'undefined') window.projects = {};
if (typeof worktrees === 'undefined') window.worktrees = [];
if (typeof ideas === 'undefined') window.ideas = {};

// Session lifecycle states
const SESSION_STATES = {
    PLANNED: 'planned',
    STARTED: 'started',
    IN_PROGRESS: 'in_progress',
    TESTING: 'testing',
    CLOSING: 'closing',
    COMPLETED: 'completed',
    ARCHIVED: 'archived'
};

// Session checklist items
const SESSION_CHECKLIST = {
    start: [
        { id: 'git_status', label: 'Verify git status is clean', required: true },
        { id: 'pull_latest', label: 'Pull latest changes from main', required: true },
        { id: 'create_branch', label: 'Create/checkout feature branch', required: true },
        { id: 'start_frontend', label: 'Start frontend server on correct port', required: true },
        { id: 'start_backend', label: 'Start backend server on correct port', required: true },
        { id: 'verify_servers', label: 'Verify servers are running', required: true },
        { id: 'review_items', label: 'Review sprint items to implement', required: true }
    ],
    during: [
        { id: 'commit_regularly', label: 'Commit changes regularly', required: true },
        { id: 'test_changes', label: 'Test each change as implemented', required: true },
        { id: 'update_ideas', label: 'Update ideas.json status', required: false }
    ],
    closing: [
        { id: 'test_functionality', label: 'Test all new functionality', required: true },
        { id: 'regression_test', label: 'Run regression tests', required: true },
        { id: 'add_tests', label: 'Add automated tests for new features', required: false },
        { id: 'update_ideas_final', label: 'Update ideas.json with final status', required: true },
        { id: 'commit_final', label: 'Commit all final changes', required: true },
        { id: 'push_branch', label: 'Push branch to remote', required: true },
        { id: 'document_changes', label: 'Document changes in session notes', required: true }
    ]
};

// Removed - using generateSessionSetupScript from session-enhanced.js instead
/*
function generateSessionStartPrompt(session, project, worktree) {
    // Get actual sprint items from ideas
    const sprintItems = ideas.items?.filter(item => 
        item.sprint === (session.sprintName || session.sprint) && 
        item.status !== 'done'
    ) || [];
    
    const itemsList = sprintItems.map((item, i) => 
        `${i + 1}. [${item.id}] ${item.title} (${item.priority})\n   ${item.description}`
    ).join('\n\n');

    return `# Development Session Start: ${session.sessionId}

## Project: ${project.name}
## Sprint: ${session.sprintName}
## Worktree: ${session.worktreeName}

## 🎯 Session Objectives
${itemsList}

## 📋 Pre-Start Checklist

### 1. Git & Worktree Setup
\`\`\`bash
# Project configuration
PROJECT_PATH="/Users/kellypellas/DevProjects/${project.name}"
WORKTREE_NAME="${session.worktreeName}"
WORKTREE_PATH="$PROJECT_PATH/worktrees/$WORKTREE_NAME"
BRANCH="${worktree.branchName || session.worktreeName}"

# Create worktree if it doesn't exist
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Creating worktree..."
    cd "$PROJECT_PATH"
    git worktree add "worktrees/$WORKTREE_NAME" -b "$BRANCH" || {
        # If branch exists, just check it out
        git worktree add "worktrees/$WORKTREE_NAME" "$BRANCH"
    }
fi

# Navigate to worktree
cd "$WORKTREE_PATH"

# Check git status (should be clean)
git status

# Ensure we're on the correct branch
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"
\`\`\`

### 2. Start Development Servers
\`\`\`bash
# Install dependencies if needed
[[ ! -d "node_modules" ]] && npm install

# Terminal 1 - Frontend (Port ${worktree.frontendPort})
cd "$WORKTREE_PATH"
npm run dev -- --port ${worktree.frontendPort}

# Terminal 2 - Backend (Port ${worktree.backendPort})  
cd "$WORKTREE_PATH"
PORT=${worktree.backendPort} npm run server
\`\`\`

### 3. Verify Setup
- [ ] Git status is clean
- [ ] On correct branch: ${worktree.branchName || session.worktreeName}
- [ ] Frontend running on http://localhost:${worktree.frontendPort}
- [ ] Backend running on http://localhost:${worktree.backendPort}
- [ ] Can access application in browser

## 💻 Development Guidelines

### Commit Strategy
- Commit after each completed item
- Use descriptive commit messages
- Format: \`[${session.sessionId}] Type: Description\`
- Example: \`[${session.sessionId}] Fix: Prevent enter key from opening detached email view\`

### Testing Requirements
- Test each change immediately after implementation
- Run existing tests: \`npm test\`
- Add tests for new functionality

### Update Tracking
After completing each item:
1. Update item status in ideas.json
2. Commit the change
3. Note completion in session

## 📝 Session Notes
Record important decisions, blockers, and progress here:

---
*Session started: ${new Date().toISOString()}*
`;
}
*/

function generateSessionClosePrompt(session, closureType) {
    // Get actual sprint items and their current status
    const sprintItems = ideas.items?.filter(item => 
        item.sprint === (session.sprintName || session.sprint)
    ) || [];
    
    const completedItems = sprintItems.filter(item => item.status === 'done');
    const inProgressItems = sprintItems.filter(item => item.status === 'in_progress');
    const notStartedItems = sprintItems.filter(item => item.status === 'new');
    
    const completed = completedItems.map(item => `✅ ${item.id}: ${item.title}`).join('\n') || 'None';
    const inProgress = inProgressItems.map(item => `⚡ ${item.id}: ${item.title}`).join('\n') || 'None';
    const notStarted = notStartedItems.map(item => `□ ${item.id}: ${item.title}`).join('\n') || 'None';

    return `# Development Session Close: ${session.sessionId}

## 🏁 Session Summary
- **Duration**: ${session.duration || 'Unknown'}
- **Sprint**: ${session.sprintName}
- **Worktree**: ${session.worktreeName}
- **Status**: ${session.closureType || 'COMPLETE'}

## ✅ Closing Checklist

### Testing
- [ ] All new functionality tested manually
- [ ] Regression tests run and passing
- [ ] No console errors in browser
- [ ] Application loads correctly
- [ ] All API endpoints responding

### Code Quality
- [ ] Code reviewed for quality
- [ ] No commented-out code left
- [ ] Console.logs removed
- [ ] Lint checks passing: \`npm run lint\`

### Git Management
\`\`\`bash
# Final commit
git add -A
git commit -m "[${session.sessionId}] Session close: ${session.closureType}"

# Push to remote
git push -u origin ${session.worktreeName}

# Check final status
git status
git log --oneline -5
\`\`\`

### Ideas.json Update
- [ ] All completed items marked as 'done'
- [ ] Incomplete items status updated appropriately
- [ ] Activity logs updated

## 📊 Work Completed

### Completed Items
${completed}

### In Progress  
${inProgress}

### Not Started
${notStarted}

## 📝 Session Notes
${session.notes || 'No notes provided'}

## Choose Completion Type:

### → WIP (Continue Later)
\`\`\`bash
git add -A && git commit -m "WIP: ${completedItems.length} items done, ${inProgressItems.length} in progress"
git push origin ${session.worktreeName || session.worktree}
# Servers will be stopped, worktree preserved
\`\`\`

### → READY TO MERGE  
\`\`\`bash
npm test && npm run lint  # Run checks
git push origin ${session.worktreeName || session.worktree}
gh pr create --title "${session.sprintName || session.sprint}: ${completedItems.length} items completed"
# Update ideas.json: mark items done
\`\`\`

### → ABANDON
\`\`\`bash
git stash save "Abandoned session: ${session.sessionId}"
# Reset item statuses in ideas.json
\`\`\`

## 🚀 Next Steps
${closureType === 'WIP' ? `
### Work In Progress (WIP)
- Branch preserved for continuation
- Items remain in progress
- Resume in next session
` : session.closureType === 'ARCHIVE' ? `
### Archived
- Work completed but not merged
- Branch preserved for reference
- May be merged later
` : session.closureType === 'ABANDON' ? `
### Abandoned
- Work discontinued
- Branch may be deleted
- Items returned to backlog
` : `
### Complete
- All items completed
- Ready for merge to main
- Create pull request
`}

## 🔄 Post-Session Actions
1. Stop development servers
2. Review this summary
3. Update project documentation if needed
4. Create PR if work is complete

---
*Session closed: ${new Date().toISOString()}*
`;
}

// Enhanced session card rendering
function renderEnhancedSessionCard(session) {
    const isExpanded = window.expandedSessionId === session.sessionId;
    const checklist = session.checklist || {};
    
    // Use state if available, otherwise derive from status
    const state = session.state || (session.status === 'ready' ? 'planned' : session.status);
    
    const statusColor = 
        state === SESSION_STATES.COMPLETED || state === 'completed' ? 'border-green-500 bg-green-50' :
        state === SESSION_STATES.IN_PROGRESS || state === 'active' ? 'border-blue-500 bg-blue-50' :
        state === SESSION_STATES.TESTING ? 'border-purple-500 bg-purple-50' :
        state === SESSION_STATES.CLOSING ? 'border-orange-500 bg-orange-50' :
        'border-gray-300';

    // Handle both field name formats
    const sprintName = session.sprintName || session.sprint;
    const worktreeName = session.worktreeName || session.worktree;

    return `
        <div class="border-2 ${statusColor} rounded-lg p-4 mb-4 cursor-pointer" onclick="toggleSessionExpand('${session.sessionId}')">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <p class="font-mono text-sm font-bold">${session.sessionId}</p>
                    <p class="text-sm text-gray-600 mt-1">
                        Sprint: ${sprintName} • Worktree: ${worktreeName}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${session.items} items • Created: ${new Date(session.created).toLocaleString()}
                    </p>
                </div>
                <div class="flex gap-2">
                    <span class="px-2 py-1 text-xs font-medium bg-white rounded">
                        ${state}
                    </span>
                    <button onclick="event.stopPropagation(); toggleSessionExpand('${session.sessionId}')" 
                        class="text-xs text-blue-600 hover:text-blue-800">
                        ${isExpanded ? '▼ Collapse' : '▶ Expand'}
                    </button>
                </div>
            </div>

            ${isExpanded ? `
                <div class="border-t pt-3 mt-3">
                    <!-- Session Tabs -->
                    <div class="flex gap-2 mb-3 border-b">
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'overview')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 ${!session.activeTab || session.activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent'}">
                            Overview
                        </button>
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'start')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 ${session.activeTab === 'start' ? 'border-blue-500 text-blue-600' : 'border-transparent'}">
                            Start Prompt
                        </button>
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'complete')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 ${session.activeTab === 'complete' ? 'border-blue-500 text-blue-600' : 'border-transparent'}">
                            Complete
                        </button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div class="space-y-4">
                    ${(!session.activeTab || session.activeTab === 'overview') ? `
                        <!-- Overview Tab -->
                        <div>
                            <h4 class="text-sm font-semibold mb-2">Sprint Items (${typeof session.items === 'number' ? session.items : session.items?.length || 0})</h4>
                        <div class="space-y-1">
                            ${Array.isArray(session.items) ? session.items.map(item => `
                                <div class="flex items-center gap-2 text-xs">
                                    <input type="checkbox" 
                                        id="item-${session.sessionId}-${item.id}"
                                        ${item.status === 'done' ? 'checked' : ''}
                                        onchange="updateItemCompletion('${session.sessionId}', '${item.id}', this.checked)">
                                    <label for="item-${session.sessionId}-${item.id}" 
                                        class="${item.status === 'done' ? 'line-through text-gray-500' : ''}">
                                        [${item.id}] ${item.title}
                                    </label>
                                </div>
                            `).join('') : `<p class="text-xs text-gray-500">Item details not loaded</p>`}
                        </div>
                    </div>

                    <!-- Checklists based on state -->
                    ${session.state === SESSION_STATES.PLANNED ? `
                        <div>
                            <h4 class="text-sm font-semibold mb-2">Start Checklist</h4>
                            <div class="space-y-1">
                                ${SESSION_CHECKLIST.start.map(item => `
                                    <div class="flex items-center gap-2 text-xs">
                                        <input type="checkbox" 
                                            id="check-${session.sessionId}-${item.id}"
                                            ${checklist[item.id] ? 'checked' : ''}
                                            onchange="updateChecklist('${session.sessionId}', '${item.id}', this.checked)">
                                        <label for="check-${session.sessionId}-${item.id}">
                                            ${item.label} ${item.required ? '*' : ''}
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : session.state === SESSION_STATES.CLOSING ? `
                        <div>
                            <h4 class="text-sm font-semibold mb-2">Closing Checklist</h4>
                            <div class="space-y-1">
                                ${SESSION_CHECKLIST.closing.map(item => `
                                    <div class="flex items-center gap-2 text-xs">
                                        <input type="checkbox" 
                                            id="check-${session.sessionId}-${item.id}"
                                            ${checklist[item.id] ? 'checked' : ''}
                                            onchange="updateChecklist('${session.sessionId}', '${item.id}', this.checked)">
                                        <label for="check-${session.sessionId}-${item.id}">
                                            ${item.label} ${item.required ? '*' : ''}
                                        </label>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                        <!-- Session Notes -->
                        <div onclick="event.stopPropagation()">
                            <h4 class="text-sm font-semibold mb-2">Session Notes</h4>
                        <textarea 
                            id="notes-${session.sessionId}"
                            class="w-full p-2 text-xs border rounded"
                            rows="3"
                            placeholder="Record decisions, blockers, progress..."
                            onchange="updateSessionNotes('${session.sessionId}', this.value)"
                            onclick="event.stopPropagation()"
                        >${session.notes || ''}</textarea>
                        <button onclick="event.stopPropagation(); updateSessionNotes('${session.sessionId}', document.getElementById('notes-${session.sessionId}').value)" 
                            class="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                            Save Notes
                        </button>
                    </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-2 flex-wrap">
                        ${session.state === SESSION_STATES.PLANNED ? `
                            <button onclick="startSession('${session.sessionId}')" 
                                class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                                Start Session
                            </button>
                        ` : ''}
                        
                        ${session.state === SESSION_STATES.STARTED || session.state === SESSION_STATES.IN_PROGRESS ? `
                            <button onclick="setSessionState('${session.sessionId}', '${SESSION_STATES.TESTING}')" 
                                class="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">
                                Begin Testing
                            </button>
                        ` : ''}
                        
                        ${session.state === SESSION_STATES.TESTING ? `
                            <button onclick="setSessionState('${session.sessionId}', '${SESSION_STATES.CLOSING}')" 
                                class="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">
                                Begin Close
                            </button>
                        ` : ''}
                        
                        ${session.state === SESSION_STATES.CLOSING ? `
                            <select onchange="closeSession('${session.sessionId}', this.value); this.value='';" 
                                class="px-3 py-1 text-xs border rounded">
                                <option value="">Close Session As...</option>
                                <option value="COMPLETE">Complete - Ready to Merge</option>
                                <option value="WIP">WIP - Continue Later</option>
                                <option value="ARCHIVE">Archive - Keep Branch</option>
                                <option value="ABANDON">Abandon - Return to Backlog</option>
                            </select>
                        ` : ''}
                        
                        <button onclick="viewSessionPrompt('${session.sessionId}', '${session.state}')" 
                            class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
                            View ${session.state === SESSION_STATES.CLOSING ? 'Close' : 'Start'} Prompt
                        </button>
                        
                        <button onclick="copySessionCommand('${session.sessionId}')" 
                            class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
                            Copy Commands
                        </button>
                    </div>
                    ` : session.activeTab === 'start' ? `
                        <!-- Start Tab Content -->
                        <div>
                            <p class="text-sm text-gray-600">Start prompt functionality is available in the enhanced session view.</p>
                        </div>
                    ` : session.activeTab === 'complete' ? `
                        <!-- Complete Tab Content -->
                        <div>
                            <p class="text-sm text-gray-600">Complete prompt functionality is available in the enhanced session view.</p>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        </div>
    `;
}

// Session management functions
// Use window.expandedSessionId directly, don't create a local variable

function toggleSessionExpand(sessionId) {
    window.expandedSessionId = window.expandedSessionId === sessionId ? null : sessionId;
    // Call the global renderSessionsTab if it exists
    if (typeof renderSessionsTab === 'function') {
        renderSessionsTab();
    } else {
        // Fallback: directly update the sessions list
        const projectSessions = sessions.filter(s => s.projectId === activeProject);
        const sessionsList = document.getElementById('sessionsList');
        if (sessionsList) {
            sessionsList.innerHTML = projectSessions.length > 0
                ? projectSessions.map(session => renderEnhancedSessionCard(session)).join('')
                : '<p class="text-gray-500 text-sm">No sessions yet.</p>';
        }
    }
}

async function startSession(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    // Session start - script will be generated in session-enhanced.js
    
    // Update session state
    session.state = SESSION_STATES.STARTED;
    session.startedAt = new Date().toISOString();
    await updateSession(session);
    
    // Open prompt in new window
    window.open(`/api/sessions/${sessionId}/prompt?type=start`, '_blank');
    
    if (typeof renderSessionsTab === 'function') renderSessionsTab();
}

async function setSessionState(sessionId, newState) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    session.state = newState;
    session[`${newState}At`] = new Date().toISOString();
    
    await updateSession(session);
    if (typeof renderSessionsTab === 'function') renderSessionsTab();
}

async function closeSession(sessionId, closureType) {
    if (!closureType) return;
    
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    // Generate close prompt
    const completedItems = session.items?.filter(i => i.status === 'done') || [];
    const prompt = generateSessionClosePrompt(session, completedItems, session.notes);
    
    // Save close prompt
    await fetch('/api/session-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: sessionId,
            promptType: 'close',
            content: prompt
        })
    });
    
    // Update session
    session.state = SESSION_STATES.COMPLETED;
    session.closureType = closureType;
    session.completedAt = new Date().toISOString();
    
    // Calculate duration
    if (session.startedAt) {
        const start = new Date(session.startedAt);
        const end = new Date(session.completedAt);
        const hours = Math.floor((end - start) / (1000 * 60 * 60));
        const minutes = Math.floor(((end - start) % (1000 * 60 * 60)) / (1000 * 60));
        session.duration = `${hours}h ${minutes}m`;
    }
    
    await updateSession(session);
    
    // Open close prompt
    window.open(`/api/sessions/${sessionId}/prompt?type=close`, '_blank');
    
    if (typeof renderSessionsTab === 'function') renderSessionsTab();
}

async function updateSession(session) {
    try {
        await fetch('/api/session-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: session.sessionId,
                updates: session
            })
        });
    } catch (error) {
        console.error('Failed to update session:', error);
    }
}

async function updateChecklist(sessionId, checkId, checked) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    if (!session.checklist) session.checklist = {};
    session.checklist[checkId] = checked;
    
    await updateSession(session);
}

async function updateItemCompletion(sessionId, itemId, completed) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    const item = session.items?.find(i => i.id === itemId);
    if (item) {
        item.status = completed ? 'done' : 'in_progress';
        item.updated = new Date().toISOString();
        
        // Also update in ideas.json
        const ideaItem = ideas.items?.find(i => i.id === itemId);
        if (ideaItem) {
            ideaItem.status = item.status;
            ideaItem.updated = item.updated;
            
            await fetch(`/api/projects/${activeProject}/ideas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ideas)
            });
        }
    }
    
    await updateSession(session);
}

async function updateSessionNotes(sessionId, notes) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    session.notes = notes;
    await updateSession(session);
}

function copySessionCommand(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    const worktree = worktrees.find(w => w.name === session.worktreeName);
    const commands = `
# Navigate to worktree
cd ${worktree?.path || 'WORKTREE_PATH'}

# Start Frontend (Terminal 1)
npm run dev -- --port ${worktree?.frontendPort || 5173}

# Start Backend (Terminal 2)
PORT=${worktree?.backendPort || 3001} npm run server
    `.trim();
    
    navigator.clipboard.writeText(commands);
    alert('Commands copied to clipboard!');
}

// Export functions and variables
// Initialize expandedSessionId if it doesn't exist
if (typeof window.expandedSessionId === 'undefined') {
    window.expandedSessionId = null;
}
window.renderEnhancedSessionCard = renderEnhancedSessionCard;
window.toggleSessionExpand = toggleSessionExpand;
window.startSession = startSession;
window.setSessionState = setSessionState;
window.closeSession = closeSession;
window.updateChecklist = updateChecklist;
window.updateItemCompletion = updateItemCompletion;
window.updateSessionNotes = updateSessionNotes;
window.copySessionCommand = copySessionCommand;
window.SESSION_STATES = SESSION_STATES;