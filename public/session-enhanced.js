// Enhanced session card with tab-based progression

function renderEnhancedSessionCardWithTabs(session) {
    const isExpanded = window.expandedSessionId === session.sessionId;
    const activeTab = session.activeTab || 'overview';
    
    // Get actual sprint items
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === (session.sprintName || session.sprint)
    ) || [];
    
    // Determine state
    const state = session.state || (session.status === 'ready' ? 'planned' : session.status);
    
    const statusColor = 
        state === 'completed' ? 'border-green-500 bg-green-50' :
        state === 'active' || state === 'in_progress' ? 'border-blue-500 bg-blue-50' :
        state === 'testing' ? 'border-purple-500 bg-purple-50' :
        state === 'closing' ? 'border-orange-500 bg-orange-50' :
        'border-gray-300';

    const sprintName = session.sprintName || session.sprint;
    const worktreeName = session.worktreeName || session.worktree;

    return `
        <div class="border-2 ${statusColor} rounded-lg p-4 mb-4">
            <div class="flex justify-between items-start mb-3">
                <div class="cursor-pointer flex-1" onclick="toggleSessionExpand('${session.sessionId}')">
                    <p class="font-mono text-sm font-bold">${session.sessionId}</p>
                    <p class="text-sm text-gray-600 mt-1">
                        Sprint: ${sprintName} • Worktree: ${worktreeName}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${typeof session.items === 'number' ? session.items : sprintItems.length} items • 
                        Created: ${new Date(session.created).toLocaleString()}
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
                    <div class="flex gap-1 mb-3 border-b">
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'overview')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:text-gray-700'
                            }">
                            Overview
                        </button>
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'start')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === 'start' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:text-gray-700'
                            }">
                            Start
                        </button>
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'complete')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === 'complete' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:text-gray-700'
                            }">
                            Complete/Stop
                        </button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div class="mt-3">
                        ${activeTab === 'overview' ? `
                            <!-- Overview Tab -->
                            <div class="space-y-3">
                                <div>
                                    <h4 class="text-sm font-semibold mb-2">Sprint Items</h4>
                                    <div class="space-y-1 text-xs">
                                        ${sprintItems.map(item => `
                                            <div class="flex items-center gap-2">
                                                ${item.status === 'done' ? '✅' : 
                                                  item.status === 'in_progress' ? '⚡' : '□'}
                                                <span class="${item.status === 'done' ? 'line-through text-gray-500' : ''}">
                                                    [${item.id}] ${item.title}
                                                </span>
                                            </div>
                                        `).join('') || '<p class="text-gray-500">No items in this sprint</p>'}
                                    </div>
                                </div>
                                
                                <div onclick="event.stopPropagation()">
                                    <h4 class="text-sm font-semibold mb-2">Session Notes</h4>
                                    <textarea 
                                        id="notes-${session.sessionId}"
                                        class="w-full p-2 text-xs border rounded"
                                        rows="3"
                                        placeholder="Record decisions, blockers, progress..."
                                        onclick="event.stopPropagation()"
                                    >${session.notes || ''}</textarea>
                                    <button onclick="event.stopPropagation(); saveSessionNotes('${session.sessionId}')" 
                                        class="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                        Save Notes
                                    </button>
                                </div>
                            </div>
                        ` : activeTab === 'start' ? `
                            <!-- Start Tab -->
                            <div class="space-y-3">
                                <div class="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                                    <div class="font-bold mb-2">🚀 Sprint: ${sprintName}</div>
                                    <div class="text-xs mb-3">Session: ${session.sessionId} | Worktree: ${worktreeName}</div>
                                    
                                    <div class="mb-3">
                                        <div class="font-bold mb-1">START SCRIPT:</div>
                                        <pre class="bg-white p-3 rounded border text-xs leading-relaxed overflow-x-auto" style="white-space: pre-wrap; word-wrap: break-word;">#!/bin/bash
# Quick Sprint Session Setup - ${sprintName}

# CONFIGURATION
WORKTREE_PATH="${session.workingPath || `/Users/kellypellas/DevProjects/${activeProject}/worktrees/${worktreeName}`}"
BRANCH="${worktreeName}"
FRONTEND_PORT=${session.frontendPort || 5173}
BACKEND_PORT=${session.backendPort || 3001}

echo "🚀 Starting Sprint: ${sprintName}"

# Navigate to worktree
cd "$WORKTREE_PATH" || exit 1

# Install dependencies if needed
[[ ! -d "node_modules" ]] && npm install

# Setup git branch
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

# Clear ports
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null

# Start servers
npm run dev -- --port $FRONTEND_PORT > frontend.log 2>&1 &
FRONTEND_PID=$!

PORT=$BACKEND_PORT npm run server > backend.log 2>&1 &
BACKEND_PID=$!

# Verify
sleep 3
echo "✅ Frontend PID: $FRONTEND_PID on port $FRONTEND_PORT"
echo "✅ Backend PID: $BACKEND_PID on port $BACKEND_PORT"
echo "📊 Dashboard: http://localhost:$FRONTEND_PORT"

# ============================================
# SPRINT ITEMS TO COMPLETE
# ============================================

${sprintItems.map((item, i) => `
# ${i + 1}. [${item.id}] ${item.title} (${item.priority})
#    ${item.description ? item.description.replace(/\n/g, '\n#    ') : 'No description'}
#    Status: ${item.status}
`).join('')}

# ============================================
# WORKFLOW
# ============================================
# 1. Review each item above
# 2. Update status in Ideas & Issues tab as you work
# 3. Commit regularly: git add -A && git commit -m "feat: description"
# 4. Test changes before marking complete
# 5. When done, use Complete/Stop tab for closing scripts</pre>
                                    </div>
                                    
                                    <button onclick="event.stopPropagation(); copyStartPrompt('${session.sessionId}')" 
                                        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">
                                        Copy Commands
                                    </button>
                                </div>
                                
                                ${state === 'planned' ? `
                                    <button onclick="event.stopPropagation(); markSessionStarted('${session.sessionId}')" 
                                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium">
                                        Mark Session Started
                                    </button>
                                ` : ''}
                            </div>
                        ` : activeTab === 'complete' ? `
                            <!-- Complete/Stop Tab -->
                            <div class="space-y-3">
                                <div>
                                    <h4 class="text-sm font-semibold mb-2">Session Status</h4>
                                    <div class="text-xs space-y-1 mb-3">
                                        <div>✅ Completed: ${sprintItems.filter(i => i.status === 'done').length} items</div>
                                        <div>⚡ In Progress: ${sprintItems.filter(i => i.status === 'in_progress').length} items</div>
                                        <div>□ Not Started: ${sprintItems.filter(i => i.status === 'new').length} items</div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 class="text-sm font-semibold mb-2">How are you ending this session?</h4>
                                    <div class="space-y-2">
                                        <button onclick="event.stopPropagation(); generateCloseScript('${session.sessionId}', 'stop')" 
                                            class="w-full p-3 text-left border rounded hover:bg-gray-50 transition-colors">
                                            <div class="font-medium text-sm">🛑 Quick Stop</div>
                                            <div class="text-xs text-gray-600 mt-1">Just stopping servers for a break (WIP commit optional)</div>
                                        </button>
                                        
                                        <button onclick="event.stopPropagation(); generateCloseScript('${session.sessionId}', 'wip')" 
                                            class="w-full p-3 text-left border rounded hover:bg-orange-50 transition-colors">
                                            <div class="font-medium text-sm">🔄 Work in Progress</div>
                                            <div class="text-xs text-gray-600 mt-1">Save progress, will continue in next session</div>
                                        </button>
                                        
                                        <button onclick="event.stopPropagation(); generateCloseScript('${session.sessionId}', 'complete')" 
                                            class="w-full p-3 text-left border rounded hover:bg-green-50 transition-colors">
                                            <div class="font-medium text-sm">✅ Complete & Merge</div>
                                            <div class="text-xs text-gray-600 mt-1">Work is done, ready to merge</div>
                                        </button>
                                        
                                        <button onclick="event.stopPropagation(); generateCloseScript('${session.sessionId}', 'abandon')" 
                                            class="w-full p-3 text-left border rounded hover:bg-red-50 transition-colors">
                                            <div class="font-medium text-sm">❌ Abandon</div>
                                            <div class="text-xs text-gray-600 mt-1">Discard changes, reset items to backlog</div>
                                        </button>
                                    </div>
                                </div>
                                
                                <div id="closeScript-${session.sessionId}" class="hidden">
                                    <!-- Script will be generated here when option is selected -->
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// Ensure toggleSessionExpand is available
if (typeof window.toggleSessionExpand === 'undefined') {
    window.toggleSessionExpand = function(sessionId) {
        window.expandedSessionId = window.expandedSessionId === sessionId ? null : sessionId;
        if (typeof renderSessionsTab === 'function') {
            renderSessionsTab();
        }
    };
}

// Helper functions for session management
function showSessionTab(sessionId, tabName) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
        session.activeTab = tabName;
        renderSessionsTab();
    }
}

function saveSessionNotes(sessionId) {
    const notesElement = document.getElementById(`notes-${sessionId}`);
    if (notesElement) {
        updateSessionNotes(sessionId, notesElement.value);
    }
}

function copyStartPrompt(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
        // Generate start prompt inline
        const sprintName = session.sprintName || session.sprint;
        const worktreeName = session.worktreeName || session.worktree;
        const sprintItems = ideas?.items?.filter(item => 
            item.sprint === sprintName
        ) || [];
        
        const prompt = `#!/bin/bash
# Quick Sprint Session Setup - ${sprintName}

# CONFIGURATION
WORKTREE_PATH="${session.workingPath || `/Users/kellypellas/DevProjects/${activeProject}/worktrees/${worktreeName}`}"
BRANCH="${worktreeName}"
FRONTEND_PORT=${session.frontendPort || 5173}
BACKEND_PORT=${session.backendPort || 3001}

echo "🚀 Starting Sprint: ${sprintName}"

# Navigate to worktree
cd "$WORKTREE_PATH" || exit 1

# Install dependencies if needed
[[ ! -d "node_modules" ]] && npm install

# Setup git branch
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

# Clear ports
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null

# Start servers
npm run dev -- --port $FRONTEND_PORT > frontend.log 2>&1 &
FRONTEND_PID=$!

PORT=$BACKEND_PORT npm run server > backend.log 2>&1 &
BACKEND_PID=$!

# Verify
sleep 3
echo "✅ Frontend PID: $FRONTEND_PID on port $FRONTEND_PORT"
echo "✅ Backend PID: $BACKEND_PID on port $BACKEND_PORT"
echo "📊 Dashboard: http://localhost:$FRONTEND_PORT"

# ============================================
# SPRINT ITEMS TO COMPLETE
# ============================================

${sprintItems.map((item, i) => `
# ${i + 1}. [${item.id}] ${item.title} (${item.priority})
#    ${item.description ? item.description.replace(/\n/g, '\n#    ') : 'No description'}
#    Status: ${item.status}
`).join('')}

# ============================================
# WORKFLOW
# ============================================
# 1. Review each item above
# 2. Update status in Ideas & Issues tab as you work
# 3. Commit regularly: git add -A && git commit -m "feat: description"
# 4. Test changes before marking complete
# 5. When done, use Complete/Stop tab for closing scripts`;
        
        navigator.clipboard.writeText(prompt);
        alert('Start script with sprint items copied to clipboard!');
    }
}

function copyCommand(command) {
    navigator.clipboard.writeText(command);
    alert('Command copied to clipboard!');
}

function generateCloseScript(sessionId, outcome) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    const sprintName = session.sprintName || session.sprint;
    const worktreeName = session.worktreeName || session.worktree;
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === sprintName
    ) || [];
    
    const completedItems = sprintItems.filter(i => i.status === 'done');
    const inProgressItems = sprintItems.filter(i => i.status === 'in_progress');
    
    let prompt = '';
    
    if (outcome === 'stop') {
        prompt = `# 🛑 Quick Stop - ${sprintName}

## Stop Servers
\`\`\`bash
lsof -ti:${session.frontendPort || 5173} | xargs kill -9
lsof -ti:${session.backendPort || 3001} | xargs kill -9
\`\`\`

## Optional: Save WIP
\`\`\`bash
git add -A
git commit -m "WIP: ${sprintName} checkpoint"
\`\`\`

✅ Session paused - resume anytime`;
        
    } else if (outcome === 'wip') {
        prompt = `# 🔄 Work in Progress - ${sprintName}

## Session Summary
- Completed: ${completedItems.length} items
- In Progress: ${inProgressItems.length} items
- Branch: ${worktreeName}

## Save Your Work
\`\`\`bash
git add -A
git commit -m "WIP: ${sprintName} - ${completedItems.length} done, ${inProgressItems.length} in progress

Completed:
${completedItems.map(i => `- ${i.title}`).join('\n')}

In Progress:
${inProgressItems.map(i => `- ${i.title}`).join('\n')}"

git push origin ${worktreeName}
\`\`\`

## Stop Servers
\`\`\`bash
lsof -ti:${session.frontendPort || 5173} | xargs kill -9
lsof -ti:${session.backendPort || 3001} | xargs kill -9
\`\`\`

✅ Work saved - continue in next session`;
        
    } else if (outcome === 'complete') {
        prompt = `# ✅ Complete & Ready to Merge - ${sprintName}

## Completed Items (${completedItems.length})
${completedItems.map(i => `- [${i.id}] ${i.title}`).join('\n')}

## Final Checks
\`\`\`bash
npm test
npm run lint
git status
\`\`\`

## Commit & Push
\`\`\`bash
git add -A
git commit -m "feat: Complete ${sprintName}

${completedItems.map(i => `- ${i.title}`).join('\n')}

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin ${worktreeName}
\`\`\`

## Create Pull Request
\`\`\`bash
gh pr create --title "${sprintName}: ${completedItems.length} items completed" \\
  --body "Completed items:\\n${completedItems.map(i => `- ${i.title}`).join('\\n')}"
\`\`\`

## Update ideas.json
Mark completed items as 'done' in Ideas & Issues tab

## Stop Servers
\`\`\`bash
lsof -ti:${session.frontendPort || 5173} | xargs kill -9
lsof -ti:${session.backendPort || 3001} | xargs kill -9
\`\`\`

✅ Sprint complete - ready for merge!`;
        
    } else if (outcome === 'abandon') {
        prompt = `# ❌ Abandon Session - ${sprintName}

## Save or Discard Changes
\`\`\`bash
# Option 1: Stash changes (can recover later)
git stash save "Abandoned: ${sprintName} - ${new Date().toISOString()}"

# Option 2: Discard all changes (permanent)
git reset --hard HEAD
git clean -fd
\`\`\`

## Stop Servers
\`\`\`bash
lsof -ti:${session.frontendPort || 5173} | xargs kill -9
lsof -ti:${session.backendPort || 3001} | xargs kill -9
\`\`\`

## Reset Item Statuses
Go to Ideas & Issues tab and reset statuses to 'new' for:
${sprintItems.filter(i => i.status !== 'new').map(i => `- [${i.id}] ${i.title}`).join('\n')}

⚠️ Session abandoned - items returned to backlog`;
    }
    
    // Display the prompt in the UI
    const scriptDiv = document.getElementById(`closeScript-${sessionId}`);
    if (scriptDiv) {
        scriptDiv.classList.remove('hidden');
        scriptDiv.innerHTML = `
            <div class="border rounded p-3 mt-3 bg-gray-50">
                <pre class="bg-white p-3 rounded border text-xs leading-relaxed overflow-x-auto" style="white-space: pre-wrap; word-wrap: break-word;">${prompt}</pre>
                <button onclick="navigator.clipboard.writeText(\`${prompt.replace(/`/g, '\\`')}\`); alert('Closing instructions copied!');" 
                    class="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                    Copy Instructions
                </button>
            </div>
        `;
    }
}

function copyScript(scriptType, sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    const sprintName = session.sprintName || session.sprint;
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === sprintName
    ) || [];
    
    let script = '';
    
    if (scriptType === 'stop') {
        script = `#!/bin/bash
# Quick Session Cleanup - ${sprintName}

FRONTEND_PORT=${session.frontendPort || 5173}
BACKEND_PORT=${session.backendPort || 3001}

echo "🛑 Stopping Sprint Session: ${sprintName}"

# Kill processes on ports
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null

# Optional: Save work in progress
git add -A
git commit -m "WIP: ${sprintName} checkpoint $(date +%Y%m%d-%H%M%S)"

echo "✅ Servers stopped"
echo "✅ Work saved as WIP commit"`;
    } else if (scriptType === 'complete') {
        const completedItems = sprintItems.filter(i => i.status === 'done');
        script = `#!/bin/bash
# Complete Sprint Session - ${sprintName}

# Save and push work
git add -A
git commit -m "feat: Complete ${sprintName} tasks

${completedItems.map(item => `- ${item.title}`).join('\n')}

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin HEAD

# Update .ideas.json for completed items
${completedItems.map(item => `
ITEM_ID="${item.id}"
jq '.items |= map(if .id == "'$ITEM_ID'" then . + {"status": "done", "completedAt": "'$(date -Iseconds)'"} else . end)' .ideas.json > tmp.json && mv tmp.json .ideas.json`).join('')}

# Stop servers
lsof -ti:${session.frontendPort || 5173} | xargs kill -9 2>/dev/null
lsof -ti:${session.backendPort || 3001} | xargs kill -9 2>/dev/null

echo "✅ Sprint ${sprintName} completed and pushed"`;
    }
    
    navigator.clipboard.writeText(script);
    alert(`${scriptType === 'stop' ? 'Stop' : 'Complete'} script copied to clipboard!`);
}

async function markSessionStarted(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
        session.state = 'in_progress';
        session.startedAt = new Date().toISOString();
        
        // Update session on server
        try {
            await fetch('/api/session-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: session.sessionId,
                    updates: { state: session.state, startedAt: session.startedAt }
                })
            });
        } catch (error) {
            console.error('Failed to update session:', error);
        }
        
        renderSessionsTab();
    }
}

function updateItemStatus(sessionId, itemId, newStatus) {
    const item = ideas.items?.find(i => i.id === itemId);
    if (item) {
        item.status = newStatus;
        item.updated = new Date().toISOString();
        // Save ideas to server
        fetch(`/api/projects/${activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ideas)
        }).then(() => {
            renderSessionsTab();
        });
    }
}

async function completeSession(sessionId, completionType) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    // Generate completion prompt inline
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === (session.sprintName || session.sprint)
    ) || [];
    
    const completed = sprintItems.filter(i => i.status === 'done');
    const inProgress = sprintItems.filter(i => i.status === 'in_progress');
    const notStarted = sprintItems.filter(i => i.status === 'new');
    
    const prompt = `# Complete Session: ${session.sessionId}
Type: ${completionType}

## Progress
✅ Completed: ${completed.length} items
⚡ In Progress: ${inProgress.length} items
□ Not Started: ${notStarted.length} items

## ${completionType === 'WIP' ? 'Save Work in Progress' : completionType === 'MERGE' ? 'Ready to Merge' : 'Abandon Session'}

${completionType === 'WIP' ? `git add -A && git commit -m "WIP: ${completed.length} done, ${inProgress.length} in progress"
git push origin ${session.worktree}` : 
completionType === 'MERGE' ? `npm test && npm run lint
git push origin ${session.worktree}
gh pr create --title "${session.sprint}: ${completed.length} items completed"` :
`git stash save "Abandoned: ${session.sessionId}"
# Reset item statuses in ideas.json`}

## Cleanup
- Stop servers (Ctrl+C)
- Update ideas.json statuses
${completionType !== 'ABANDON' ? '- Push branch' : '- Discard changes'}`;
    
    // Show prompt in a copyable format
    const promptDiv = document.createElement('div');
    promptDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    promptDiv.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl max-h-screen overflow-y-auto">
            <h3 class="text-lg font-bold mb-4">Session Completion: ${completionType}</h3>
            <pre class="bg-gray-50 p-4 rounded text-xs font-mono whitespace-pre-wrap">${prompt}</pre>
            <div class="flex gap-2 mt-4">
                <button onclick="navigator.clipboard.writeText(\`${prompt.replace(/`/g, '\\`')}\`); alert('Copied!')" 
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Copy Instructions
                </button>
                <button onclick="this.closest('.fixed').remove()" 
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(promptDiv);
    
    // Update session state
    session.state = 'completed';
    session.completionType = completionType;
    session.completedAt = new Date().toISOString();
    
    // Update on server
    try {
        await fetch('/api/session-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: session.sessionId,
                updates: { 
                    state: session.state, 
                    completionType: session.completionType,
                    completedAt: session.completedAt 
                }
            })
        });
    } catch (error) {
        console.error('Failed to update session:', error);
    }
    
    renderSessionsTab();
}

// Export the new enhanced function
window.renderEnhancedSessionCardWithTabs = renderEnhancedSessionCardWithTabs;
window.showSessionTab = showSessionTab;
window.saveSessionNotes = saveSessionNotes;
window.copyStartPrompt = copyStartPrompt;
window.copyCommand = copyCommand;
window.generateCloseScript = generateCloseScript;
window.copyScript = copyScript;
window.markSessionStarted = markSessionStarted;
window.updateItemStatus = updateItemStatus;
window.completeSession = completeSession;

// Post-session verification and cleanup
function verifySessionClosure(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return null;
    
    const verification = {
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        checks: [],
        warnings: [],
        errors: [],
        summary: ''
    };
    
    // Check for running processes
    const frontendPort = session.frontendPort || 5173;
    const backendPort = session.backendPort || 3001;
    
    // Get sprint items status
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === (session.sprintName || session.sprint)
    ) || [];
    
    const completedItems = sprintItems.filter(i => i.status === 'done');
    const inProgressItems = sprintItems.filter(i => i.status === 'in_progress');
    const notStartedItems = sprintItems.filter(i => i.status === 'new');
    
    // Build verification report
    verification.checks.push({
        name: 'Sprint Items',
        status: 'info',
        details: `✅ ${completedItems.length} completed, ⚡ ${inProgressItems.length} in progress, □ ${notStartedItems.length} not started`
    });
    
    // Check session closure type
    if (session.closureType) {
        verification.checks.push({
            name: 'Closure Type',
            status: 'success',
            details: `Session closed as: ${session.closureType}`
        });
    } else {
        verification.warnings.push('Session closed without specifying closure type');
    }
    
    // Check for uncommitted changes warning
    if (session.closureType === 'ABANDON' && inProgressItems.length > 0) {
        verification.warnings.push(`${inProgressItems.length} items were in progress and may need status reset`);
    }
    
    // Check session duration
    if (session.duration) {
        verification.checks.push({
            name: 'Session Duration',
            status: 'info',
            details: session.duration
        });
    }
    
    // Generate summary
    const outcome = session.closureType || 'UNKNOWN';
    verification.summary = `Session ${sessionId} closed (${outcome}). ${completedItems.length}/${sprintItems.length} items completed.`;
    
    return verification;
}

// Display post-session summary in dashboard
function showPostSessionSummary(sessionId) {
    const verification = verifySessionClosure(sessionId);
    if (!verification) return;
    
    const session = sessions.find(s => s.sessionId === sessionId);
    const sprintName = session?.sprintName || session?.sprint || 'Unknown Sprint';
    const worktreeName = session?.worktreeName || session?.worktree || 'Unknown Worktree';
    
    // Create summary modal
    const summaryDiv = document.createElement('div');
    summaryDiv.id = `session-summary-${sessionId}`;
    summaryDiv.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-xl border-2 border-blue-500 p-4 max-w-md z-50 animate-slide-in';
    summaryDiv.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h3 class="font-bold text-lg">📊 Session Closed</h3>
                <p class="text-xs text-gray-600">${verification.timestamp}</p>
            </div>
            <button onclick="this.closest('#session-summary-${sessionId}').remove()" 
                class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        
        <div class="mb-3">
            <p class="font-mono text-sm font-bold mb-1">${sessionId}</p>
            <p class="text-xs text-gray-600">Sprint: ${sprintName}</p>
            <p class="text-xs text-gray-600">Worktree: ${worktreeName}</p>
        </div>
        
        <div class="space-y-2 mb-3">
            ${verification.checks.map(check => `
                <div class="flex items-start gap-2 text-xs">
                    <span class="${
                        check.status === 'success' ? 'text-green-500' :
                        check.status === 'warning' ? 'text-orange-500' :
                        check.status === 'error' ? 'text-red-500' :
                        'text-blue-500'
                    }">${
                        check.status === 'success' ? '✅' :
                        check.status === 'warning' ? '⚠️' :
                        check.status === 'error' ? '❌' :
                        'ℹ️'
                    }</span>
                    <div>
                        <div class="font-medium">${check.name}</div>
                        <div class="text-gray-600">${check.details}</div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${verification.warnings.length > 0 ? `
            <div class="bg-orange-50 border border-orange-200 rounded p-2 mb-3">
                <h4 class="text-xs font-bold text-orange-800 mb-1">⚠️ Warnings</h4>
                <ul class="text-xs text-orange-700 space-y-1">
                    ${verification.warnings.map(w => `<li>• ${w}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${verification.errors.length > 0 ? `
            <div class="bg-red-50 border border-red-200 rounded p-2 mb-3">
                <h4 class="text-xs font-bold text-red-800 mb-1">❌ Errors</h4>
                <ul class="text-xs text-red-700 space-y-1">
                    ${verification.errors.map(e => `<li>• ${e}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div class="bg-gray-50 rounded p-2 mb-3">
            <p class="text-xs font-medium text-gray-700">${verification.summary}</p>
        </div>
        
        <div class="border-t pt-3">
            <h4 class="text-xs font-bold mb-2">🔍 Verify Cleanup</h4>
            <div class="bg-gray-50 rounded p-2 text-xs font-mono space-y-1">
                <div>lsof -ti:${session?.frontendPort || 5173} | wc -l  # Should be 0</div>
                <div>lsof -ti:${session?.backendPort || 3001} | wc -l  # Should be 0</div>
                <div>git status  # Check for uncommitted changes</div>
            </div>
            <button onclick="navigator.clipboard.writeText('lsof -ti:${session?.frontendPort || 5173} | wc -l; lsof -ti:${session?.backendPort || 3001} | wc -l; cd ${session?.workingPath || '.'} && git status'); alert('Commands copied!')" 
                class="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Copy Verification Commands
            </button>
        </div>
        
        ${session?.closureType === 'WIP' ? `
            <div class="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
                <p class="text-xs text-blue-700">
                    <strong>Next Session:</strong> Resume with worktree <code>${worktreeName}</code>
                </p>
            </div>
        ` : session?.closureType === 'COMPLETE' ? `
            <div class="bg-green-50 border border-green-200 rounded p-2 mt-3">
                <p class="text-xs text-green-700">
                    <strong>Next Step:</strong> Create PR for branch <code>${worktreeName}</code>
                </p>
            </div>
        ` : session?.closureType === 'ABANDON' ? `
            <div class="bg-gray-50 border border-gray-200 rounded p-2 mt-3">
                <p class="text-xs text-gray-700">
                    <strong>Cleanup:</strong> Reset item statuses in Ideas & Issues tab
                </p>
            </div>
        ` : ''}
    `;
    
    // Add styles for animation
    if (!document.getElementById('post-session-styles')) {
        const style = document.createElement('style');
        style.id = 'post-session-styles';
        style.textContent = `
            @keyframes slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            .animate-slide-in {
                animation: slide-in 0.3s ease-out;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove any existing summary for this session
    const existingSummary = document.getElementById(`session-summary-${sessionId}`);
    if (existingSummary) existingSummary.remove();
    
    // Add to body
    document.body.appendChild(summaryDiv);
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        const summary = document.getElementById(`session-summary-${sessionId}`);
        if (summary) {
            summary.style.opacity = '0';
            summary.style.transition = 'opacity 0.5s';
            setTimeout(() => summary.remove(), 500);
        }
    }, 30000);
}

// Enhanced generateCloseScript to trigger summary
const originalGenerateCloseScript = window.generateCloseScript;
window.generateCloseScript = function(sessionId, outcome) {
    // Call original function
    originalGenerateCloseScript(sessionId, outcome);
    
    // Mark session as closed
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
        session.closureType = outcome.toUpperCase();
        session.closedAt = new Date().toISOString();
        
        // Calculate duration if we have start time
        if (session.startedAt) {
            const start = new Date(session.startedAt);
            const end = new Date(session.closedAt);
            const minutes = Math.floor((end - start) / (1000 * 60));
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            session.duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
        
        // Show post-session summary after a short delay
        setTimeout(() => {
            showPostSessionSummary(sessionId);
        }, 1000);
    }
};

window.verifySessionClosure = verifySessionClosure;
window.showPostSessionSummary = showPostSessionSummary;