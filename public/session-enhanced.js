// Enhanced session card with tab-based progression
// THIS IS THE PRIMARY SESSION CARD RENDERER USED BY THE DASHBOARD
// It provides tabs for Overview/Start/Complete and full session management

// Ensure global variables are available
if (typeof sessions === 'undefined') window.sessions = [];
if (typeof activeProject === 'undefined') window.activeProject = null;
if (typeof ideas === 'undefined') window.ideas = {};

// Shared function to generate session setup script
function generateSessionSetupScript(session) {
    const sprintName = session.sprintName || session.sprint;
    const worktreeName = session.worktreeName || session.worktree;
    const frontendPort = session.worktree?.frontendPort || session.frontendPort || 5173;
    const backendPort = session.worktree?.backendPort || session.backendPort || 3001;
    
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === sprintName && item.status !== 'done'
    ) || [];
    
    return `#!/bin/bash
# Quick Sprint Session Setup - ${sprintName}

# CONFIGURATION
PROJECT_PATH="/Users/kellypellas/DevProjects/${activeProject}"
WORKTREE_NAME="${worktreeName}"
WORKTREE_PATH="$PROJECT_PATH/worktrees/$WORKTREE_NAME"
BRANCH="${worktreeName}"
FRONTEND_PORT=${frontendPort}
BACKEND_PORT=${backendPort}

echo "🚀 Starting Sprint: ${sprintName}"
echo "📁 Project: ${activeProject}"
echo "🌳 Worktree: $WORKTREE_NAME"

# Create worktree if it doesn't exist
if [ ! -d "$WORKTREE_PATH" ]; then
    echo "Creating worktree..."
    cd "$PROJECT_PATH" || exit 1
    git worktree add "worktrees/$WORKTREE_NAME" -b "$BRANCH" || {
        # If branch exists, just check it out
        git worktree add "worktrees/$WORKTREE_NAME" "$BRANCH"
    }
fi

# Navigate to worktree
cd "$WORKTREE_PATH" || exit 1

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup git branch
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

# Check git status
echo "Checking git status..."
git status --short

# Clear ports
echo "Clearing ports if in use..."
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true

# Start servers
echo "Starting servers..."
npm run dev -- --port $FRONTEND_PORT > frontend.log 2>&1 &
FRONTEND_PID=$!

PORT=$BACKEND_PORT npm run server > backend.log 2>&1 &
BACKEND_PID=$!

# Verify
sleep 5
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend running: http://localhost:$FRONTEND_PORT (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend failed - check frontend.log"
fi

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend running: http://localhost:$BACKEND_PORT (PID: $BACKEND_PID)"
else
    echo "❌ Backend failed - check backend.log"
fi

# ============================================
# SPRINT ITEMS TO COMPLETE
# ============================================

${sprintItems.map((item, i) => {
    let itemText = `
# ${i + 1}. [${item.id}] ${item.title} (${item.priority})
#    ${item.description ? item.description.replace(/\n/g, '\n#    ') : 'No description'}
#    Status: ${item.status}`;
    
    if (item.comments && item.comments.length > 0) {
        itemText += `\n#    Comments (${item.comments.length}):`;
        item.comments.forEach((comment, idx) => {
            const date = new Date(comment.timestamp).toLocaleString();
            const text = comment.text.replace(/\n/g, '\n#        ');
            itemText += `\n#      [${date}] ${text}`;
        });
    }
    
    return itemText + '\n';
}).join('')}

# ============================================
# WORKFLOW
# ============================================
# 1. Review each item above
# 2. Ensure you’re in the right git and worktree
# 3. Start the server on correct front ended back up report.
# 4. Update status in Ideas & Issues tab as you work with comments and change status.
# 5. You will be prompted with a close session prompt when the session is done. This will include details about git, worktree hygiene, etc.`;
}

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
                    <button onclick="event.stopPropagation(); deleteSession('${session.sessionId}')" 
                        class="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                        title="Delete session">
                        Delete
                    </button>
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
                            📜 Start Script
                        </button>
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'complete')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === 'complete' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:text-gray-700'
                            }">
                            🏁 Close Script
                        </button>
                        <button onclick="event.stopPropagation(); showSessionTab('${session.sessionId}', 'verify')" 
                            class="px-3 py-1 text-xs font-medium border-b-2 transition-colors ${
                                activeTab === 'verify' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:text-gray-700'
                            }">
                            ✅ Verify
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
                                        <div class="font-bold mb-1">START SCRIPT (Editable):</div>
                                        <textarea 
                                            id="start-script-${session.sessionId}"
                                            class="w-full bg-white p-3 rounded border text-xs font-mono leading-relaxed"
                                            rows="25"
                                            style="white-space: pre; overflow-x: auto;"
                                            onclick="event.stopPropagation()"
                                        >${session.customStartScript || generateSessionSetupScript(session)}</textarea>
                                    </div>
                                    
                                    <div class="flex gap-2">
                                        <button onclick="event.stopPropagation(); copyStartPrompt('${session.sessionId}')" 
                                            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">
                                            Copy Script
                                        </button>
                                        <button onclick="event.stopPropagation(); saveStartScript('${session.sessionId}')" 
                                            class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs">
                                            Save Edits
                                        </button>
                                        <button onclick="event.stopPropagation(); resetStartScript('${session.sessionId}')" 
                                            class="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs">
                                            Reset to Default
                                        </button>
                                    </div>
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
                                        <button onclick="event.stopPropagation(); generateCloseScript('${session.sessionId}', 'wip')" 
                                            class="w-full p-3 text-left border rounded hover:bg-orange-50 transition-colors">
                                            <div class="font-medium text-sm">🔄 Work in Progress</div>
                                            <div class="text-xs text-gray-600 mt-1">Commit and save progress, will continue later</div>
                                        </button>
                                        
                                        <button onclick="event.stopPropagation(); generateCloseScript('${session.sessionId}', 'complete')" 
                                            class="w-full p-3 text-left border rounded hover:bg-green-50 transition-colors">
                                            <div class="font-medium text-sm">✅ Complete & Merge</div>
                                            <div class="text-xs text-gray-600 mt-1">Work is done, ready to ship to main</div>
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
                        ` : activeTab === 'verify' ? `
                            <!-- Verification Tab -->
                            <div class="space-y-3">
                                <div class="bg-blue-50 p-3 rounded">
                                    <h4 class="text-sm font-semibold mb-2">📋 Session Verification</h4>
                                    <p class="text-xs text-gray-600 mb-3">
                                        Run these checks after you've executed your close script to verify the session was properly closed.
                                    </p>
                                </div>
                                
                                <button onclick="event.stopPropagation(); runVerification('${session.sessionId}')" 
                                    class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium">
                                    Run Verification Checks
                                </button>
                                
                                <div id="verificationResults-${session.sessionId}" class="hidden">
                                    <!-- Verification results will appear here -->
                                </div>
                                
                                <div class="text-xs text-gray-500 space-y-1">
                                    <p>Verification will check:</p>
                                    <ul class="list-disc list-inside ml-2">
                                        <li>Git status and commits</li>
                                        <li>Branch push status</li>
                                        <li>Server shutdown status</li>
                                        <li>Port availability</li>
                                        <li>Ideas.json updates</li>
                                        <li>Session completion status</li>
                                    </ul>
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
    const session = window.sessions.find(s => s.sessionId === sessionId);
    if (session) {
        session.activeTab = tabName;
        renderSessionsTab();
    }
}

function saveSessionNotes(sessionId) {
    const notesElement = document.getElementById(`notes-${sessionId}`);
    if (notesElement) {
        if (typeof updateSessionNotes === 'function') {
            updateSessionNotes(sessionId, notesElement.value);
        }
    }
}

function copyStartPrompt(sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    if (session) {
        // Get the edited content from textarea or use the saved custom script
        const scriptElement = document.getElementById(`start-script-${sessionId}`);
        const prompt = scriptElement ? scriptElement.value : (session.customStartScript || generateSessionSetupScript(session));
        navigator.clipboard.writeText(prompt);
        alert('Start script copied to clipboard!');
    }
}

function saveStartScript(sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    const scriptElement = document.getElementById(`start-script-${sessionId}`);
    if (session && scriptElement) {
        session.customStartScript = scriptElement.value;
        // Optionally save to server
        alert('Start script saved!');
    }
}

function resetStartScript(sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    const scriptElement = document.getElementById(`start-script-${sessionId}`);
    if (session && scriptElement) {
        const defaultScript = generateSessionSetupScript(session);
        scriptElement.value = defaultScript;
        session.customStartScript = null;
        alert('Start script reset to default!');
    }
}

function copyCommand(command) {
    navigator.clipboard.writeText(command);
    alert('Command copied to clipboard!');
}

function generateCloseScript(sessionId, outcome) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    // Store the closure type for verification to use later
    session.closureType = outcome.toUpperCase();
    session.lastCloseAction = outcome.toUpperCase();
    
    const sprintName = session.sprintName || session.sprint;
    const worktreeName = session.worktreeName || session.worktree;
    // Must have ports from worktree config - no fallbacks
    const frontendPort = session.worktree?.frontendPort;
    const backendPort = session.worktree?.backendPort;
    
    if (!frontendPort || !backendPort) {
        alert('Error: Worktree ports not configured. Please check worktree configuration.');
        return;
    }
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === sprintName && item.status !== 'done'
    ) || [];
    
    const completedItems = sprintItems.filter(i => i.status === 'done');
    const inProgressItems = sprintItems.filter(i => i.status === 'in_progress');
    
    let prompt = '';
    
    if (outcome === 'wip') {
        // Get session start time if available
        const sessionDuration = session.startedAt ? 
            Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000) : 'unknown';
        
        prompt = `#!/bin/bash
# Session Close Script - Work in Progress
# Sprint: ${sprintName}
# Generated: ${new Date().toLocaleString()}

echo "=========================================="
echo "🔄 Closing Session - Work in Progress"
echo "=========================================="
echo "Sprint: ${sprintName}"
echo "Branch: ${worktreeName}"
echo "Session Duration: ${sessionDuration} minutes"
echo "Completed: ${completedItems.length} items"
echo "In Progress: ${inProgressItems.length} items"
echo ""

# Verify we're in the right place
EXPECTED_BRANCH="${worktreeName}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "❌ ERROR: Wrong branch!"
    echo "Expected: $EXPECTED_BRANCH"
    echo "Current: $CURRENT_BRANCH"
    exit 1
fi

# Navigate to worktree
cd "/Users/kellypellas/DevProjects/${activeProject}/worktrees/${worktreeName}" || exit 1

# Show session metrics
echo "📊 Session Metrics:"
echo "----------------------------"
COMMITS_THIS_SESSION=$(git log --oneline --since="${sessionDuration} minutes ago" 2>/dev/null | wc -l)
echo "Commits made: $COMMITS_THIS_SESSION"
echo ""
echo "Files changed:"
git diff --stat HEAD~$COMMITS_THIS_SESSION 2>/dev/null || git diff --stat HEAD
echo ""

# Generate handover notes
HANDOVER_NOTES="Session ${sessionDuration}min: Completed ${completedItems.length} items, ${inProgressItems.length} in progress. ${completedItems.length > 0 ? 'Completed: ' + completedItems.map(i => i.title).join(', ') + '. ' : ''}${inProgressItems.length > 0 ? 'Still working on: ' + inProgressItems.map(i => i.title).join(', ') + '.' : ''}"

echo "📝 Handover notes generated:"
echo "$HANDOVER_NOTES"
echo ""
echo "Edit if needed (or press Enter to use as-is):"
read -e -i "$HANDOVER_NOTES" HANDOVER_NOTES

# Save work
echo "💾 Committing work..."
git add -A
git commit -m "WIP: ${sprintName} - ${completedItems.length} done, ${inProgressItems.length} in progress

Session: ${sessionDuration} minutes
Completed:
${completedItems.map(i => `- ${i.title}`).join('\n')}

In Progress:
${inProgressItems.map(i => `- ${i.title}`).join('\n')}

Handover: $HANDOVER_NOTES" || echo "No changes to commit"

# Stop servers
echo "🛑 Stopping servers..."
lsof -ti:${frontendPort} | xargs kill -9 2>/dev/null || true
lsof -ti:${backendPort} | xargs kill -9 2>/dev/null || true

echo ""
echo "✅ Session saved locally (not pushed)"
echo ""
echo "⚠️ IMPORTANT - Update Ideas & Issues:"
echo "1. Add handover notes as comments to in-progress items"
echo "2. Update item statuses if needed"
echo ""
echo "📋 Handover notes to add:"
echo "$HANDOVER_NOTES"
echo ""
echo "🌳 Branch: ${worktreeName}"
echo "⏱️ Session duration: ${sessionDuration} minutes"`;
        
    } else if (outcome === 'complete') {
        const sessionDuration = session.startedAt ? 
            Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000) : 'unknown';
            
        prompt = `#!/bin/bash
# Session Close Script - Complete
# Sprint: ${sprintName}
# Generated: ${new Date().toLocaleString()}

echo "=========================================="
echo "✅ Closing Session - Sprint Complete"
echo "=========================================="
echo "Sprint: ${sprintName}"
echo "Branch: ${worktreeName}"
echo "Session Duration: ${sessionDuration} minutes"
echo "Completed: ${completedItems.length} items"
echo ""

# Verify we're in the right place
EXPECTED_BRANCH="${worktreeName}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "❌ ERROR: Wrong branch!"
    echo "Expected: $EXPECTED_BRANCH"
    echo "Current: $CURRENT_BRANCH"
    exit 1
fi

# Navigate to worktree
cd "/Users/kellypellas/DevProjects/${activeProject}/worktrees/${worktreeName}" || exit 1

# Show what we're about to complete
echo "📊 Review changes before completing:"
echo "----------------------------"
echo "Files modified:"
git diff --name-status main...HEAD
echo ""
echo "New files added:"
git diff --diff-filter=A --name-only main...HEAD
echo ""

# Verify no debug code or TODOs left
echo "🔍 Checking for leftover debug code..."
DEBUG_COUNT=$(grep -r "console.log\\|debugger\\|TODO\\|FIXME" --include="*.js" --include="*.jsx" . 2>/dev/null | wc -l)
if [ $DEBUG_COUNT -gt 0 ]; then
    echo "⚠️ Found $DEBUG_COUNT instances of debug code/TODOs"
    grep -r "console.log\\|debugger\\|TODO\\|FIXME" --include="*.js" --include="*.jsx" . 2>/dev/null | head -5
    echo ""
    echo "Continue and commit WITH this debug code? (y/n)"
    read -p "Choice: " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ Good choice! Clean up debug code first, then run close script again"
        exit 1
    fi
fi

# Run tests BEFORE committing
echo "🧪 Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed - fix before completing"
    exit 1
fi

echo "🔍 Running lint..."
npm run lint
if [ $? -ne 0 ]; then
    echo "⚠️ Lint warnings found"
    read -p "Continue with warnings? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "❌ Aborting - fix lint warnings first"
        exit 1
    fi
fi

# Final commit
echo "💾 Creating final commit..."
git add -A
git commit -m "feat: Complete ${sprintName}

${completedItems.map(i => `- ${i.title}`).join('\n')}

Session duration: ${sessionDuration} minutes

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>" || echo "No changes to commit"

# Merge to main locally (no push)
echo "🔀 Merging to main locally..."
git checkout main
git merge ${worktreeName} --no-ff -m "Merge ${worktreeName}: ${sprintName} complete"

# Verify merge succeeded
if [ $? -ne 0 ]; then
    echo "❌ Merge failed! Please resolve conflicts and try again"
    echo "Branch and worktree preserved for conflict resolution"
    exit 1
fi

# Verify the merge actually happened
MERGE_CHECK=$(git log --oneline -1 | grep -c "Merge ${worktreeName}")
if [ $MERGE_CHECK -eq 0 ]; then
    echo "❌ Merge verification failed - branch not merged to main"
    echo "Branch and worktree preserved"
    exit 1
fi

echo "✅ Branch successfully merged to main"

# Stop servers
echo "🛑 Stopping servers..."
lsof -ti:${frontendPort} | xargs kill -9 2>/dev/null || true
lsof -ti:${backendPort} | xargs kill -9 2>/dev/null || true

# Clean up worktree
echo "🧹 Cleaning up worktree..."
cd "/Users/kellypellas/DevProjects/${activeProject}"
git worktree remove "worktrees/${worktreeName}" --force

# Delete the branch (will fail if not merged)
echo "🗑️ Deleting merged branch..."
git branch -d ${worktreeName}
if [ $? -ne 0 ]; then
    echo "⚠️ Could not delete branch with -d, it may not be fully merged"
    echo "Use 'git branch -D ${worktreeName}' to force delete if you're sure"
fi

echo ""
echo "✅ Sprint complete and merged locally!"
echo "✅ Worktree removed"
echo "✅ Branch deleted"
echo ""

# Auto-update items to done
echo "📝 Updating items to 'done' status..."
${completedItems.map(item => `
echo "Marking ${item.id} as done"
# This would need API call to update - for now showing what needs updating
`).join('')}

echo "⚠️ NEXT STEP (when ready for bulk operations):"
echo "   git push origin main"
echo ""
echo "Session duration: ${sessionDuration} minutes"
echo "Items completed: ${completedItems.length}"`;
        
    } else if (outcome === 'abandon') {
        const sessionDuration = session.startedAt ? 
            Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000) : 'unknown';
            
        prompt = `#!/bin/bash
# Session Close Script - Abandon
# Sprint: ${sprintName}
# Generated: ${new Date().toLocaleString()}

echo "=========================================="
echo "❌ Abandoning Session"
echo "=========================================="
echo "Sprint: ${sprintName}"
echo "Branch: ${worktreeName}"
echo "Session Duration: ${sessionDuration} minutes"
echo ""

# Verify we're in the right place
EXPECTED_BRANCH="${worktreeName}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
    echo "❌ ERROR: Wrong branch!"
    echo "Expected: $EXPECTED_BRANCH"
    echo "Current: $CURRENT_BRANCH"
    exit 1
fi

# Navigate to worktree
cd "/Users/kellypellas/DevProjects/${activeProject}/worktrees/${worktreeName}" || exit 1

# Show what will be abandoned
echo "📊 Changes that will be abandoned:"
git status --short
echo ""

# Abandon means delete everything
echo "⚠️ ABANDONING: This will delete all uncommitted work!"
echo ""

# Show what will be lost
if [ -n "$(git status --porcelain)" ]; then
    echo "Uncommitted changes that will be DELETED:"
    git status --short
    echo ""
fi

read -p "Type 'ABANDON' to confirm deletion: " CONFIRM
if [ "$CONFIRM" != "ABANDON" ]; then
    echo "❌ Abandon cancelled"
    exit 0
fi

# Delete all changes
echo "🗑️ Deleting all uncommitted work..."
git reset --hard HEAD
git clean -fd
echo "✅ Uncommitted work deleted"

# Stop servers
echo "🛑 Stopping servers..."
lsof -ti:${frontendPort} | xargs kill -9 2>/dev/null || true
lsof -ti:${backendPort} | xargs kill -9 2>/dev/null || true

# Ask about cleaning up worktree and branch
echo ""
echo "🧹 Clean up worktree and branch?"
read -p "Delete worktree and branch? (y/n): " DELETE_WT
if [ "$DELETE_WT" = "y" ]; then
    cd "/Users/kellypellas/DevProjects/${activeProject}"
    echo "Removing worktree..."
    git worktree remove "worktrees/${worktreeName}" --force
    echo "Deleting branch..."
    git branch -D ${worktreeName} 2>/dev/null || echo "Branch may have unpushed commits"
    echo "✅ Worktree and branch deleted"
else
    echo "Worktree kept at: worktrees/${worktreeName}"
fi

echo ""
echo "📋 Session abandoned after ${sessionDuration} minutes"
echo ""

# Auto-reset items to 'new'
echo "📝 Resetting item statuses..."
${inProgressItems.map(item => `
echo "Resetting ${item.id} to 'new'"
# This would need API call - for now showing what needs resetting
`).join('')}

echo ""
echo "✅ Abandon complete"`;
    }
    
    // Store the generated prompt for this outcome
    if (!session.closeScripts) session.closeScripts = {};
    session.closeScripts[outcome] = prompt;
    
    // Display the prompt in the UI
    const scriptDiv = document.getElementById(`closeScript-${sessionId}`);
    if (scriptDiv) {
        scriptDiv.classList.remove('hidden');
        scriptDiv.innerHTML = `
            <div class="border rounded p-3 mt-3 bg-gray-50">
                <div class="font-bold text-xs mb-2">CLOSE SCRIPT (Editable):</div>
                <textarea 
                    id="close-script-${sessionId}-${outcome}"
                    class="w-full bg-white p-3 rounded border text-xs font-mono leading-relaxed"
                    rows="20"
                    style="white-space: pre; overflow-x: auto;"
                    onclick="event.stopPropagation()"
                >${session.customCloseScripts?.[outcome] || prompt}</textarea>
                <div class="flex gap-2 mt-2">
                    <button onclick="copyCloseScript('${sessionId}', '${outcome}'); event.stopPropagation();" 
                        class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                        Copy Script
                    </button>
                    <button onclick="saveCloseScript('${sessionId}', '${outcome}'); event.stopPropagation();" 
                        class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                        Save Edits
                    </button>
                    <button onclick="resetCloseScript('${sessionId}', '${outcome}'); event.stopPropagation();" 
                        class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
                        Reset to Default
                    </button>
                </div>
            </div>
        `;
    }
}

function runVerification(sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    // Determine closure type - check both closureType and any recent close action
    // The closureType should be set when user selects an option in the Complete tab
    let closureType = session.closureType || session.lastCloseAction || 'WIP';
    
    // Ensure it's uppercase for consistency
    closureType = closureType.toUpperCase();
    
    // Store it for the verification to use
    session.closureType = closureType;
    
    // Use the comprehensive automated verification from session-auto-verify.js
    if (window.runAutomatedVerification) {
        window.runAutomatedVerification(sessionId, closureType);
    } else {
        // Fallback to the simpler summary if auto-verify isn't loaded
        showPostSessionSummary(sessionId);
    }
    
    // Also show inline verification status in the tab
    const sprintName = session.sprintName || session.sprint;
    const worktreeName = session.worktreeName || session.worktree;
    const resultsDiv = document.getElementById(`verificationResults-${sessionId}`);
    
    if (!resultsDiv) return;
    
    // Show results div
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = `
        <div class="border rounded p-3 mt-3 bg-gray-50">
            <h4 class="text-sm font-semibold mb-2">📊 Verification Running...</h4>
            <div class="text-xs space-y-2">
                <p class="text-green-600 font-medium">✅ Full verification report will appear above</p>
                
                <div class="mt-3 p-2 bg-yellow-50 rounded">
                    <div class="font-semibold">Manual Verification Commands:</div>
                    <pre class="mt-1 text-xs">
# Check git status
git status

# Check if branch was pushed  
git log origin/${worktreeName}..${worktreeName}

# Check ports
lsof -ti:${frontendPort}
lsof -ti:${backendPort}

# Verify ideas.json updates
git diff HEAD~1 ideas.json
</pre>
                </div>
                
                <div class="mt-3">
                    <button onclick="navigator.clipboard.writeText(\`git status; git log origin/${worktreeName}..${worktreeName}; lsof -ti:${session.worktree?.frontendPort || 5173}; lsof -ti:${session.worktree?.backendPort || 3001}\`); alert('Verification commands copied!');" 
                        class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                        Copy Verification Commands
                    </button>
                </div>
            </div>
        </div>
    `;
}

function copyScript(scriptType, sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    const sprintName = session.sprintName || session.sprint;
    const frontendPort = session.worktree?.frontendPort || session.frontendPort || 5173;
    const backendPort = session.worktree?.backendPort || session.backendPort || 3001;
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === sprintName && item.status !== 'done'
    ) || [];
    
    let script = '';
    
    if (scriptType === 'stop') {
        script = `#!/bin/bash
# Quick Session Cleanup - ${sprintName}

FRONTEND_PORT=${frontendPort}
BACKEND_PORT=${backendPort}

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
lsof -ti:${frontendPort} | xargs kill -9 2>/dev/null
lsof -ti:${backendPort} | xargs kill -9 2>/dev/null

echo "✅ Sprint ${sprintName} completed and pushed"`;
    }
    
    navigator.clipboard.writeText(script);
    alert(`${scriptType === 'stop' ? 'Stop' : 'Complete'} script copied to clipboard!`);
}

async function markSessionStarted(sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
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
    const session = window.sessions.find(s => s.sessionId === sessionId);
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
// New functions for close script management
function copyCloseScript(sessionId, outcome) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    if (session) {
        const scriptElement = document.getElementById(`close-script-${sessionId}-${outcome}`);
        const script = scriptElement ? scriptElement.value : 
                      (session.customCloseScripts?.[outcome] || session.closeScripts?.[outcome] || '');
        navigator.clipboard.writeText(script);
        alert('Close script copied to clipboard!');
    }
}

function saveCloseScript(sessionId, outcome) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    const scriptElement = document.getElementById(`close-script-${sessionId}-${outcome}`);
    if (session && scriptElement) {
        if (!session.customCloseScripts) session.customCloseScripts = {};
        session.customCloseScripts[outcome] = scriptElement.value;
        alert('Close script saved!');
    }
}

function resetCloseScript(sessionId, outcome) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
    const scriptElement = document.getElementById(`close-script-${sessionId}-${outcome}`);
    if (session && scriptElement && session.closeScripts?.[outcome]) {
        scriptElement.value = session.closeScripts[outcome];
        if (session.customCloseScripts) {
            delete session.customCloseScripts[outcome];
        }
        alert('Close script reset to default!');
    }
}

window.renderEnhancedSessionCardWithTabs = renderEnhancedSessionCardWithTabs;
window.showSessionTab = showSessionTab;
window.saveSessionNotes = saveSessionNotes;
window.copyStartPrompt = copyStartPrompt;
window.saveStartScript = saveStartScript;
window.resetStartScript = resetStartScript;
window.copyCommand = copyCommand;
window.generateCloseScript = generateCloseScript;
window.copyCloseScript = copyCloseScript;
window.saveCloseScript = saveCloseScript;
window.resetCloseScript = resetCloseScript;
window.copyScript = copyScript;
window.markSessionStarted = markSessionStarted;
window.runVerification = runVerification;
window.updateItemStatus = updateItemStatus;
window.completeSession = completeSession;

// Post-session verification and cleanup
function verifySessionClosure(sessionId) {
    const session = window.sessions.find(s => s.sessionId === sessionId);
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
    const frontendPort = session.worktree?.frontendPort || session.frontendPort || 5173;
    const backendPort = session.worktree?.backendPort || session.backendPort || 3001;
    
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
    
    const session = window.sessions.find(s => s.sessionId === sessionId);
    const sprintName = session?.sprintName || session?.sprint || 'Unknown Sprint';
    const worktreeName = session?.worktreeName || session?.worktree || 'Unknown Worktree';
    const frontendPort = session?.worktree?.frontendPort || session?.frontendPort || 5173;
    const backendPort = session?.worktree?.backendPort || session?.backendPort || 3001;
    
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
                <div>lsof -ti:${frontendPort} | wc -l  # Should be 0</div>
                <div>lsof -ti:${backendPort} | wc -l  # Should be 0</div>
                <div>git status  # Check for uncommitted changes</div>
            </div>
            <button onclick="navigator.clipboard.writeText('lsof -ti:${frontendPort} | wc -l; lsof -ti:${backendPort} | wc -l; cd ${session?.workingPath || '.'} && git status'); alert('Commands copied!')" 
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

// Removed enhanced generateCloseScript wrapper
// Verification is now only triggered manually via the Verify tab
// The original generateCloseScript function handles everything needed

window.verifySessionClosure = verifySessionClosure;
window.showPostSessionSummary = showPostSessionSummary;