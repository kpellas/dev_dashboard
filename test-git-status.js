#!/usr/bin/env node

// Test git status display in worktrees
const fetch = require('node-fetch');

async function testGitStatus() {
    console.log('📊 Testing Git Status in Worktrees\n');
    
    const res = await fetch('http://localhost:9000/api/projects/moseymail/worktrees');
    const worktrees = await res.json();
    
    console.log(`Found ${worktrees.length} worktrees:\n`);
    
    worktrees.forEach(wt => {
        console.log(`🌳 ${wt.name} (${wt.branch})`);
        
        if (wt.gitStatus) {
            if (wt.gitStatus.hasChanges) {
                console.log(`   ⚠️  ${wt.gitStatus.uncommittedChanges} uncommitted changes`);
                console.log(`   📝 Last commit: ${wt.gitStatus.lastCommit || 'unknown'}`);
                
                // Show first 5 modified files
                if (wt.gitStatus.modifiedFiles && wt.gitStatus.modifiedFiles.length > 0) {
                    console.log('   Modified files:');
                    wt.gitStatus.modifiedFiles.slice(0, 5).forEach(file => {
                        const statusIcon = 
                            file.status === 'M' ? '✏️' :
                            file.status === 'A' ? '➕' :
                            file.status === 'D' ? '❌' :
                            file.status === '??' ? '❓' : '📄';
                        console.log(`     ${statusIcon} ${file.status} ${file.path}`);
                    });
                    if (wt.gitStatus.modifiedFiles.length > 5) {
                        console.log(`     ... and ${wt.gitStatus.modifiedFiles.length - 5} more`);
                    }
                }
            } else {
                console.log('   ✅ Clean (no uncommitted changes)');
                console.log(`   📝 Last commit: ${wt.gitStatus.lastCommit || 'unknown'}`);
            }
        } else {
            console.log('   ❌ No git status available');
        }
        
        // Port status
        console.log(`   🔌 Ports: Frontend ${wt.frontendPort} (${wt.frontendPortInUse ? 'IN USE' : 'available'}), Backend ${wt.backendPort} (${wt.backendPortInUse ? 'IN USE' : 'available'})`);
        console.log();
    });
}

testGitStatus().catch(console.error);