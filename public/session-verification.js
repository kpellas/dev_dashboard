// Session verification and cleanup monitoring

// Check if ports are actually free
async function checkPortStatus(port) {
    try {
        const response = await fetch(`/api/check-port/${port}`);
        const data = await response.json();
        return data.inUse || false;
    } catch (error) {
        console.error(`Failed to check port ${port}:`, error);
        return false;
    }
}

// Comprehensive session health check
async function performSessionHealthCheck(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return null;
    
    const healthCheck = {
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        ports: {},
        git: {},
        items: {},
        overall: 'healthy'
    };
    
    // Check ports
    const frontendPort = session.frontendPort || 5173;
    const backendPort = session.backendPort || 3001;
    
    healthCheck.ports.frontend = {
        port: frontendPort,
        inUse: await checkPortStatus(frontendPort)
    };
    
    healthCheck.ports.backend = {
        port: backendPort,
        inUse: await checkPortStatus(backendPort)
    };
    
    // Check git status
    try {
        const gitResponse = await fetch(`/api/git-status?worktree=${session.worktreeName || session.worktree}`);
        const gitData = await gitResponse.json();
        healthCheck.git = gitData;
    } catch (error) {
        healthCheck.git.error = 'Failed to check git status';
    }
    
    // Check items status
    const sprintItems = ideas?.items?.filter(item => 
        item.sprint === (session.sprintName || session.sprint)
    ) || [];
    
    healthCheck.items.total = sprintItems.length;
    healthCheck.items.completed = sprintItems.filter(i => i.status === 'done').length;
    healthCheck.items.inProgress = sprintItems.filter(i => i.status === 'in_progress').length;
    healthCheck.items.notStarted = sprintItems.filter(i => i.status === 'new').length;
    
    // Determine overall health
    if (session.closureType) {
        // Session is closed, check for lingering processes
        if (healthCheck.ports.frontend.inUse || healthCheck.ports.backend.inUse) {
            healthCheck.overall = 'warning';
            healthCheck.issues = healthCheck.issues || [];
            healthCheck.issues.push('Ports still in use after session closure');
        }
    } else if (session.state === 'in_progress' || session.state === 'active') {
        // Session is active, ports should be in use
        if (!healthCheck.ports.frontend.inUse || !healthCheck.ports.backend.inUse) {
            healthCheck.overall = 'warning';
            healthCheck.issues = healthCheck.issues || [];
            healthCheck.issues.push('Expected servers not running');
        }
    }
    
    return healthCheck;
}

// Dashboard cleanup monitor
function initializeCleanupMonitor() {
    // Create monitor widget
    const monitorDiv = document.createElement('div');
    monitorDiv.id = 'cleanup-monitor';
    monitorDiv.className = 'fixed bottom-4 left-4 bg-white rounded-lg shadow-lg border p-3 max-w-xs hidden';
    monitorDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h4 class="text-xs font-bold">🔍 Cleanup Monitor</h4>
            <button onclick="document.getElementById('cleanup-monitor').classList.add('hidden')" 
                class="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
        </div>
        <div id="cleanup-monitor-content" class="text-xs space-y-1"></div>
    `;
    document.body.appendChild(monitorDiv);
}

// Run cleanup verification after session operations
async function runCleanupVerification() {
    const monitor = document.getElementById('cleanup-monitor');
    const content = document.getElementById('cleanup-monitor-content');
    
    if (!monitor || !content) {
        initializeCleanupMonitor();
        return;
    }
    
    // Check all recent sessions
    const recentSessions = sessions.filter(s => {
        if (!s.closedAt) return false;
        const closedTime = new Date(s.closedAt);
        const now = new Date();
        const hoursSinceClosed = (now - closedTime) / (1000 * 60 * 60);
        return hoursSinceClosed < 1; // Check sessions closed in last hour
    });
    
    if (recentSessions.length === 0) {
        monitor.classList.add('hidden');
        return;
    }
    
    monitor.classList.remove('hidden');
    content.innerHTML = '<div class="text-gray-500">Checking cleanup...</div>';
    
    const checks = [];
    for (const session of recentSessions) {
        const health = await performSessionHealthCheck(session.sessionId);
        if (health && health.overall !== 'healthy') {
            checks.push({
                sessionId: session.sessionId,
                issues: health.issues || [],
                ports: health.ports
            });
        }
    }
    
    if (checks.length === 0) {
        content.innerHTML = '<div class="text-green-600">✅ All sessions properly closed</div>';
        setTimeout(() => monitor.classList.add('hidden'), 3000);
    } else {
        content.innerHTML = checks.map(check => `
            <div class="border-t pt-1 mt-1">
                <div class="font-mono text-xs font-bold">${check.sessionId}</div>
                ${check.issues.map(issue => `
                    <div class="text-orange-600">⚠️ ${issue}</div>
                `).join('')}
                ${check.ports.frontend.inUse ? `
                    <div class="text-red-600">❌ Frontend port ${check.ports.frontend.port} still in use</div>
                ` : ''}
                ${check.ports.backend.inUse ? `
                    <div class="text-red-600">❌ Backend port ${check.ports.backend.port} still in use</div>
                ` : ''}
            </div>
        `).join('');
    }
}

// Auto-run verification periodically
let verificationInterval = null;

function startPeriodicVerification() {
    // Run immediately
    runCleanupVerification();
    
    // Run every 30 seconds
    if (verificationInterval) clearInterval(verificationInterval);
    verificationInterval = setInterval(runCleanupVerification, 30000);
}

function stopPeriodicVerification() {
    if (verificationInterval) {
        clearInterval(verificationInterval);
        verificationInterval = null;
    }
}

// Integrate with session close operations
function attachCleanupHandlers() {
    // Monitor when complete/stop tab is activated
    const originalShowSessionTab = window.showSessionTab;
    if (originalShowSessionTab) {
        window.showSessionTab = function(sessionId, tabName) {
            originalShowSessionTab(sessionId, tabName);
            if (tabName === 'complete') {
                // Start monitoring when user is on complete tab
                startPeriodicVerification();
            }
        };
    }
    
    // Enhanced close script generation with cleanup reminder
    const originalCopyScript = window.copyScript;
    if (originalCopyScript) {
        window.copyScript = function(scriptType, sessionId) {
            originalCopyScript(scriptType, sessionId);
            
            // Show cleanup reminder
            setTimeout(() => {
                const reminder = document.createElement('div');
                reminder.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg z-50';
                reminder.innerHTML = `
                    <div class="flex items-start gap-2">
                        <span class="text-yellow-600">⚠️</span>
                        <div>
                            <p class="text-sm font-medium text-yellow-800">Remember to verify cleanup!</p>
                            <p class="text-xs text-yellow-700 mt-1">Check that all servers are stopped and changes are committed.</p>
                        </div>
                        <button onclick="this.closest('div').remove()" class="ml-2 text-yellow-600 hover:text-yellow-800">&times;</button>
                    </div>
                `;
                document.body.appendChild(reminder);
                
                // Auto-remove after 5 seconds
                setTimeout(() => reminder.remove(), 5000);
            }, 100);
        };
    }
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeCleanupMonitor();
        attachCleanupHandlers();
    });
} else {
    initializeCleanupMonitor();
    attachCleanupHandlers();
}

// Export functions
window.checkPortStatus = checkPortStatus;
window.performSessionHealthCheck = performSessionHealthCheck;
window.runCleanupVerification = runCleanupVerification;
window.startPeriodicVerification = startPeriodicVerification;
window.stopPeriodicVerification = stopPeriodicVerification;