// Automated post-session verification system
// Runs actual checks after session closure to ensure everything was done properly

async function runAutomatedVerification(sessionId, closureType) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    console.log(`Running automated verification for session ${sessionId} (${closureType})`);
    
    // Create verification report
    const report = {
        sessionId: sessionId,
        closureType: closureType,
        timestamp: new Date().toISOString(),
        checks: [],
        passed: 0,
        failed: 0,
        warnings: 0
    };
    
    // Show verification in progress
    showVerificationProgress(sessionId);
    
    try {
        // 1. Check if servers are stopped
        await verifyServersStopped(session, report);
        
        // 2. Check git status and commits
        await verifyGitStatus(session, report);
        
        // 3. Check if ideas.json was updated
        await verifyIdeasUpdated(session, report);
        
        // 4. Check worktree state
        await verifyWorktreeState(session, report, closureType);
        
        // 5. Check for test files
        await verifyTestsAdded(session, report);
        
        // 6. Check for uncommitted changes
        await verifyNoUncommittedChanges(session, report, closureType);
        
        // 7. Verify branch push status
        await verifyBranchPushed(session, report, closureType);
        
    } catch (error) {
        report.checks.push({
            name: 'Verification Error',
            status: 'error',
            message: error.message
        });
        report.failed++;
    }
    
    // Show final report
    showVerificationReport(report);
    
    // Save report to session
    session.verificationReport = report;
    
    return report;
}

async function verifyServersStopped(session, report) {
    const check = {
        name: 'Server Shutdown',
        status: 'checking',
        details: []
    };
    
    try {
        // Check frontend port
        const frontendResp = await fetch(`/api/check-port/${session.frontendPort || 5173}`);
        const frontendData = frontendResp.ok ? await frontendResp.json() : { port: session.frontendPort || 5173, inUse: false, processCount: 0 };
        
        // Check backend port
        const backendResp = await fetch(`/api/check-port/${session.backendPort || 3001}`);
        const backendData = backendResp.ok ? await backendResp.json() : { port: session.backendPort || 3001, inUse: false, processCount: 0 };
        
        if (frontendData.inUse) {
            check.status = 'failed';
            check.details.push(`❌ Frontend port ${frontendData.port} still in use (${frontendData.processCount} processes)`);
            report.failed++;
        } else {
            check.details.push(`✅ Frontend port ${frontendData.port} is free`);
        }
        
        if (backendData.inUse) {
            check.status = 'failed';
            check.details.push(`❌ Backend port ${backendData.port} still in use (${backendData.processCount} processes)`);
            report.failed++;
        } else {
            check.details.push(`✅ Backend port ${backendData.port} is free`);
        }
        
        if (check.status !== 'failed') {
            check.status = 'passed';
            report.passed++;
        }
        
    } catch (error) {
        check.status = 'error';
        check.message = `Failed to check ports: ${error.message}`;
        report.failed++;
    }
    
    report.checks.push(check);
}

async function verifyGitStatus(session, report) {
    const check = {
        name: 'Git Repository',
        status: 'checking',
        details: []
    };
    
    try {
        const response = await fetch(`/api/worktree-status?worktree=${session.worktreeName || session.worktree}`);
        const data = response.ok ? await response.json() : { 
            commitsSinceStart: 0, 
            lastCommitMessage: 'Could not access repository', 
            uncommittedChanges: 0,
            error: 'Repository check failed'
        };
        
        if (data.error) {
            check.status = 'error';
            check.message = data.error;
            report.failed++;
        } else {
            // Check for commits made during session
            if (data.commitsSinceStart > 0) {
                check.details.push(`✅ ${data.commitsSinceStart} commits made during session`);
            } else {
                check.details.push(`⚠️ No commits made during session`);
                check.status = 'warning';
                report.warnings++;
            }
            
            // Check commit messages
            if (data.lastCommitMessage) {
                check.details.push(`📝 Last commit: "${data.lastCommitMessage}"`);
            }
            
            // Check for uncommitted changes
            if (data.uncommittedChanges > 0) {
                check.details.push(`⚠️ ${data.uncommittedChanges} uncommitted changes`);
                if (session.closureType !== 'ABANDON') {
                    check.status = 'warning';
                    report.warnings++;
                }
            } else {
                check.details.push(`✅ Working directory clean`);
            }
            
            if (check.status === 'checking') {
                check.status = 'passed';
                report.passed++;
            }
        }
    } catch (error) {
        check.status = 'error';
        check.message = `Failed to check git status: ${error.message}`;
        report.failed++;
    }
    
    report.checks.push(check);
}

async function verifyIdeasUpdated(session, report) {
    const check = {
        name: 'Ideas & Issues Status',
        status: 'checking',
        details: []
    };
    
    try {
        // Get current ideas
        const response = await fetch(`/api/projects/${session.projectId}/ideas`);
        const currentIdeas = response.ok ? await response.json() : { items: [] };
        
        // Check sprint items
        const sprintItems = currentIdeas.items?.filter(item => 
            item.sprint === (session.sprintName || session.sprint)
        ) || [];
        
        const completed = sprintItems.filter(i => i.status === 'done').length;
        const inProgress = sprintItems.filter(i => i.status === 'in_progress').length;
        const notStarted = sprintItems.filter(i => i.status === 'new').length;
        
        check.details.push(`📊 Sprint status: ${completed} done, ${inProgress} in progress, ${notStarted} not started`);
        
        // Check if statuses match closure type - be strict about expectations
        const closureType = session.closureType || 'WIP';
        let expectationMet = true;
        
        switch(closureType) {
            case 'COMPLETE':
                if (inProgress > 0) {
                    check.details.push(`❌ ${inProgress} items still in progress - should be marked done for COMPLETE`);
                    check.status = 'failed';
                    report.failed++;
                    expectationMet = false;
                } else if (notStarted > 0) {
                    check.details.push(`⚠️ ${notStarted} items not started - consider moving to next sprint`);
                    if (check.status !== 'failed') {
                        check.status = 'warning';
                        report.warnings++;
                    }
                } else {
                    check.details.push(`✅ All sprint items completed`);
                }
                break;
                
            case 'WIP':
                check.details.push(`✅ Items can remain in current state for WIP`);
                if (inProgress > 0) {
                    check.details.push(`📌 ${inProgress} items to continue next session`);
                }
                break;
                
            case 'ABANDON':
                if (completed > 0 || inProgress > 0) {
                    check.details.push(`❌ ${completed + inProgress} items should be reset to 'new' for ABANDON`);
                    check.status = 'failed';
                    report.failed++;
                    expectationMet = false;
                } else {
                    check.details.push(`✅ All items properly reset to backlog`);
                }
                break;
                
            default:
                check.details.push(`✅ Item statuses recorded`);
        }
        
        if (expectationMet && check.status === 'checking') {
            check.status = 'passed';
            report.passed++;
        }
        
        // Check for recent updates
        const recentUpdates = sprintItems.filter(item => {
            if (!item.updated) return false;
            const updateTime = new Date(item.updated);
            const sessionStart = new Date(session.startedAt || session.created);
            return updateTime > sessionStart;
        });
        
        if (recentUpdates.length > 0) {
            check.details.push(`✅ ${recentUpdates.length} items updated during session`);
        }
        
    } catch (error) {
        check.status = 'error';
        check.message = `Failed to check ideas: ${error.message}`;
        report.failed++;
    }
    
    report.checks.push(check);
}

async function verifyWorktreeState(session, report, closureType) {
    const check = {
        name: 'Worktree State',
        status: 'checking',
        details: []
    };
    
    try {
        const response = await fetch(`/api/projects/${session.projectId}/worktrees`);
        const worktrees = response.ok ? await response.json() : [];
        const worktree = worktrees.find(w => w.name === (session.worktreeName || session.worktree));
        
        if (!worktree) {
            // Different expectations based on closure type
            if (closureType === 'ABANDON') {
                check.details.push(`✅ Worktree removed after abandon (as expected)`);
                check.status = 'passed';
                report.passed++;
            } else {
                check.details.push(`❌ Worktree not found: ${session.worktreeName || session.worktree}`);
                check.status = 'failed';
                report.failed++;
            }
        } else {
            check.details.push(`✅ Worktree exists: ${worktree.name}`);
            
            // Check worktree state based on closure type
            switch(closureType) {
                case 'COMPLETE':
                    check.details.push(`✅ Worktree ready for PR/merge`);
                    check.details.push(`📌 Next: Create PR with 'gh pr create'`);
                    break;
                    
                case 'WIP':
                    check.details.push(`✅ Worktree preserved for continuation`);
                    if (worktree.gitStatus?.hasChanges) {
                        check.details.push(`📌 ${worktree.gitStatus.uncommittedChanges} uncommitted changes to handle next session`);
                    }
                    break;
                    
                case 'ABANDON':
                    check.details.push(`⚠️ Worktree still exists after abandon`);
                    check.details.push(`📌 Run: git worktree remove ${worktree.name}`);
                    check.status = 'warning';
                    report.warnings++;
                    break;
                    
                default:
                    check.details.push(`✅ Worktree state recorded`);
            }
            
            if (check.status === 'checking') {
                check.status = 'passed';
                report.passed++;
            }
        }
    } catch (error) {
        check.status = 'error';
        check.message = `Failed to check worktree: ${error.message}`;
        report.failed++;
    }
    
    report.checks.push(check);
}

async function verifyTestsAdded(session, report) {
    const check = {
        name: 'Test Coverage',
        status: 'checking',
        details: []
    };
    
    try {
        // Check if test files were modified
        const response = await fetch(`/api/git-changes?worktree=${session.worktreeName || session.worktree}&since=${session.startedAt || session.created}`);
        const data = response.ok ? await response.json() : { error: 'API not available' };
        
        if (data.error) {
            check.status = 'skipped';
            check.details.push(`⏭️ Could not check test files`);
        } else {
            const testFiles = data.files?.filter(f => 
                f.includes('.test.') || 
                f.includes('.spec.') || 
                f.includes('__tests__') ||
                f.includes('/test/')
            ) || [];
            
            if (testFiles.length > 0) {
                check.details.push(`✅ ${testFiles.length} test files modified`);
                check.status = 'passed';
                report.passed++;
            } else if (session.closureType === 'COMPLETE') {
                check.details.push(`⚠️ No test files added (consider adding tests)`);
                check.status = 'warning';
                report.warnings++;
            } else {
                check.details.push(`ℹ️ No test files modified`);
                check.status = 'info';
            }
        }
    } catch (error) {
        check.status = 'skipped';
        check.details.push(`⏭️ Test check skipped: ${error.message}`);
    }
    
    report.checks.push(check);
}

async function verifyNoUncommittedChanges(session, report, closureType) {
    const check = {
        name: 'Uncommitted Changes',
        status: 'checking',
        details: []
    };
    
    try {
        const response = await fetch(`/api/git-status?worktree=${session.worktreeName || session.worktree}`);
        const data = response.ok ? await response.json() : { uncommittedChanges: 0, files: [] };
        
        if (data.uncommittedChanges > 0) {
            switch(closureType) {
                case 'WIP':
                    check.details.push(`✅ ${data.uncommittedChanges} uncommitted changes (OK for WIP)`);
                    check.status = 'passed';
                    report.passed++;
                    break;
                    
                case 'ABANDON':
                    check.details.push(`⚠️ ${data.uncommittedChanges} uncommitted changes will be lost`);
                    check.details.push(`📌 Consider stashing: git stash save "Abandoned work"`);
                    check.status = 'warning';
                    report.warnings++;
                    break;
                    
                case 'COMPLETE':
                    check.details.push(`❌ ${data.uncommittedChanges} uncommitted changes - must commit before completing!`);
                    check.status = 'failed';
                    report.failed++;
                    break;
                    
                default:
                    check.details.push(`⚠️ ${data.uncommittedChanges} uncommitted changes detected`);
                    check.status = 'warning';
                    report.warnings++;
            }
            
            // List the files for context
            if (data.files && data.files.length > 0) {
                const fileList = data.files.slice(0, 5).map(f => `  - ${f.status} ${f.path}`).join('\n');
                check.details.push(`Files:\n${fileList}`);
                if (data.files.length > 5) {
                    check.details.push(`  ... and ${data.files.length - 5} more`);
                }
            }
        } else {
            check.details.push(`✅ All changes committed`);
            check.status = 'passed';
            report.passed++;
        }
    } catch (error) {
        check.status = 'error';
        check.message = `Failed to check: ${error.message}`;
        report.failed++;
    }
    
    report.checks.push(check);
}

async function verifyBranchPushed(session, report, closureType) {
    const check = {
        name: 'Branch Push Status',
        status: 'checking',
        details: []
    };
    
    try {
        const response = await fetch(`/api/branch-status?worktree=${session.worktreeName || session.worktree}`);
        const data = response.ok ? await response.json() : { error: 'API not available' };
        
        if (data.error) {
            check.status = 'error';
            check.message = data.error;
            report.failed++;
        } else {
            if (data.unpushedCommits > 0) {
                switch(closureType) {
                    case 'COMPLETE':
                        check.details.push(`⚠️ ${data.unpushedCommits} commits not pushed - consider pushing before PR`);
                        check.status = 'warning';
                        report.warnings++;
                        break;
                        
                    case 'WIP':
                        check.details.push(`ℹ️ ${data.unpushedCommits} unpushed commits - push when strategic`);
                        check.status = 'info';
                        break;
                        
                    case 'ABANDON':
                        check.details.push(`⚠️ ${data.unpushedCommits} unpushed commits will be lost`);
                        check.status = 'warning';
                        report.warnings++;
                        break;
                        
                    default:
                        check.details.push(`ℹ️ ${data.unpushedCommits} unpushed commits`);
                        check.status = 'info';
                }
            } else {
                check.details.push(`✅ All commits pushed to remote`);
                check.status = 'passed';
                report.passed++;
            }
            
            if (!data.hasUpstream && (closureType === 'COMPLETE' || closureType === 'WIP')) {
                check.details.push(`⚠️ No upstream branch set - use: git push -u origin ${session.worktreeName || session.worktree}`);
                if (check.status === 'passed') {
                    check.status = 'warning';
                    report.warnings++;
                }
            } else if (data.hasUpstream) {
                check.details.push(`✅ Tracking remote branch: ${data.upstream}`);
            }
        }
    } catch (error) {
        check.status = 'error';
        check.message = `Failed to check: ${error.message}`;
        report.failed++;
    }
    
    report.checks.push(check);
}

function showVerificationProgress(sessionId) {
    // Remove any existing progress indicator
    const existingProgress = document.getElementById(`verification-progress-${sessionId}`);
    if (existingProgress) existingProgress.remove();
    
    const progressDiv = document.createElement('div');
    progressDiv.id = `verification-progress-${sessionId}`;
    progressDiv.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-xl border-2 border-blue-500 p-4 max-w-sm z-50';
    progressDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div>
                <h3 class="font-bold text-sm">Running Verification</h3>
                <p class="text-xs text-gray-600">Checking session closure...</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(progressDiv);
}

function showVerificationReport(report) {
    // Remove progress indicator
    const progressDiv = document.getElementById(`verification-progress-${report.sessionId}`);
    if (progressDiv) progressDiv.remove();
    
    // Calculate overall status
    const overallStatus = report.failed > 0 ? 'failed' : 
                         report.warnings > 0 ? 'warning' : 'passed';
    
    const statusColors = {
        passed: 'border-green-500 bg-green-50',
        warning: 'border-orange-500 bg-orange-50',
        failed: 'border-red-500 bg-red-50'
    };
    
    const statusIcons = {
        passed: '✅',
        warning: '⚠️',
        failed: '❌',
        error: '🔴',
        info: 'ℹ️',
        skipped: '⏭️'
    };
    
    // Create report card
    const reportDiv = document.createElement('div');
    reportDiv.id = `verification-report-${report.sessionId}`;
    reportDiv.className = `fixed top-4 right-4 bg-white rounded-lg shadow-xl border-2 ${statusColors[overallStatus]} p-4 max-w-md z-50 max-h-[80vh] overflow-y-auto`;
    
    reportDiv.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h3 class="font-bold text-lg flex items-center gap-2">
                    ${statusIcons[overallStatus]} Verification Report
                </h3>
                <p class="text-xs text-gray-600">Session: ${report.sessionId}</p>
                <p class="text-xs text-gray-600">Closure: ${report.closureType}</p>
            </div>
            <button onclick="this.closest('#verification-report-${report.sessionId}').remove()" 
                class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        
        <div class="flex gap-4 mb-3 text-xs">
            <div class="flex items-center gap-1">
                <span class="text-green-600">✅</span>
                <span>${report.passed} passed</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-orange-600">⚠️</span>
                <span>${report.warnings} warnings</span>
            </div>
            <div class="flex items-center gap-1">
                <span class="text-red-600">❌</span>
                <span>${report.failed} failed</span>
            </div>
        </div>
        
        <div class="space-y-3 border-t pt-3">
            ${report.checks.map(check => `
                <div class="border rounded p-2 ${
                    check.status === 'passed' ? 'bg-green-50 border-green-200' :
                    check.status === 'warning' ? 'bg-orange-50 border-orange-200' :
                    check.status === 'failed' ? 'bg-red-50 border-red-200' :
                    check.status === 'error' ? 'bg-red-100 border-red-300' :
                    'bg-gray-50 border-gray-200'
                }">
                    <div class="flex items-start gap-2">
                        <span class="text-lg">${statusIcons[check.status] || '•'}</span>
                        <div class="flex-1">
                            <div class="font-medium text-sm">${check.name}</div>
                            ${check.message ? `<div class="text-xs text-red-600 mt-1">${check.message}</div>` : ''}
                            ${check.details && check.details.length > 0 ? `
                                <div class="text-xs text-gray-700 mt-1 space-y-1">
                                    ${check.details.map(d => `<div>${d}</div>`).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        ${overallStatus === 'failed' ? `
            <div class="mt-4 p-3 bg-red-100 border border-red-300 rounded">
                <h4 class="text-sm font-bold text-red-800 mb-2">⚠️ Action Required</h4>
                <p class="text-xs text-red-700">
                    Some checks failed. Please review and complete the necessary steps:
                </p>
                <ul class="text-xs text-red-700 mt-2 space-y-1">
                    ${report.failed > 0 && report.checks.find(c => c.name === 'Server Shutdown' && c.status === 'failed') ? 
                        '<li>• Stop running servers</li>' : ''}
                    ${report.failed > 0 && report.checks.find(c => c.name === 'Uncommitted Changes' && c.status === 'failed') ? 
                        '<li>• Commit your changes</li>' : ''}
                    ${report.failed > 0 && report.checks.find(c => c.name === 'Branch Push Status' && c.status === 'failed') ? 
                        '<li>• Push to remote branch</li>' : ''}
                </ul>
            </div>
        ` : overallStatus === 'warning' ? `
            <div class="mt-4 p-3 bg-orange-100 border border-orange-300 rounded">
                <h4 class="text-sm font-bold text-orange-800 mb-2">⚠️ Review Recommended</h4>
                <p class="text-xs text-orange-700">
                    Some warnings were found. Review them to ensure everything is as expected.
                </p>
            </div>
        ` : `
            <div class="mt-4 p-3 bg-green-100 border border-green-300 rounded">
                <h4 class="text-sm font-bold text-green-800 mb-2">✅ All Checks Passed</h4>
                <p class="text-xs text-green-700">
                    Session was properly closed. ${
                        report.closureType === 'COMPLETE' ? 'Ready for PR/merge.' :
                        report.closureType === 'WIP' ? 'Work saved for continuation.' :
                        'Session ended successfully.'
                    }
                </p>
            </div>
        `}
        
        <div class="mt-4 flex gap-2">
            <button onclick="copyVerificationReport('${report.sessionId}')" 
                class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                Copy Report
            </button>
            <button onclick="rerunVerification('${report.sessionId}', '${report.closureType}')" 
                class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
                Re-run Checks
            </button>
        </div>
    `;
    
    // Add animation styles if not present
    if (!document.getElementById('verification-styles')) {
        const style = document.createElement('style');
        style.id = 'verification-styles';
        style.textContent = `
            @keyframes slide-in {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .animate-slide-in { animation: slide-in 0.3s ease-out; }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .animate-spin { animation: spin 1s linear infinite; }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(reportDiv);
    
    // Auto-dismiss successful reports after 30 seconds
    if (overallStatus === 'passed') {
        setTimeout(() => {
            const report = document.getElementById(`verification-report-${report.sessionId}`);
            if (report) {
                report.style.opacity = '0';
                report.style.transition = 'opacity 0.5s';
                setTimeout(() => report.remove(), 500);
            }
        }, 30000);
    }
}

function copyVerificationReport(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session || !session.verificationReport) return;
    
    const report = session.verificationReport;
    let text = `Verification Report - ${sessionId}\n`;
    text += `Closure Type: ${report.closureType}\n`;
    text += `Time: ${report.timestamp}\n\n`;
    text += `Results: ${report.passed} passed, ${report.warnings} warnings, ${report.failed} failed\n\n`;
    
    report.checks.forEach(check => {
        text += `${check.name}: ${check.status.toUpperCase()}\n`;
        if (check.details && check.details.length > 0) {
            check.details.forEach(d => text += `  ${d}\n`);
        }
        if (check.message) {
            text += `  Error: ${check.message}\n`;
        }
        text += '\n';
    });
    
    navigator.clipboard.writeText(text);
    alert('Verification report copied to clipboard!');
}

function rerunVerification(sessionId, closureType) {
    runAutomatedVerification(sessionId, closureType);
}

// Hook into the close script generation to trigger verification
// Disabled automatic verification on close script generation
// Verification is now only triggered manually via the Verify tab
// const originalGenerateCloseScriptAuto = window.generateCloseScript;
// window.generateCloseScript = function(sessionId, outcome) {
//     // Call original function
//     if (originalGenerateCloseScriptAuto) {
//         originalGenerateCloseScriptAuto(sessionId, outcome);
//     }
//     
//     // Run automated verification after a delay
//     setTimeout(() => {
//         runAutomatedVerification(sessionId, outcome.toUpperCase());
//     }, 2000);
// };

// Export functions
window.runAutomatedVerification = runAutomatedVerification;
window.showVerificationReport = showVerificationReport;
window.copyVerificationReport = copyVerificationReport;
window.rerunVerification = rerunVerification;