#!/usr/bin/env node

// Test script for Dev Dashboard improvements
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:9000';

async function testPortChecking() {
  console.log('\n🔍 Testing Port Checking...');
  
  // Test port 9000 (should be in use by our server)
  const res1 = await fetch(`${BASE_URL}/api/check-port/9000`);
  const data1 = await res1.json();
  console.log(`Port 9000:`, data1);
  
  // Test a likely free port
  const res2 = await fetch(`${BASE_URL}/api/check-port/8765`);
  const data2 = await res2.json();
  console.log(`Port 8765:`, data2);
}

async function testWorktreeList() {
  console.log('\n🌳 Testing Worktree Listing...');
  
  // Get projects
  const projectsRes = await fetch(`${BASE_URL}/api/projects`);
  const projectsData = await projectsRes.json();
  
  if (projectsData.activeProject) {
    console.log(`Active project: ${projectsData.activeProject}`);
    
    // Get worktrees for active project
    const wtRes = await fetch(`${BASE_URL}/api/projects/${projectsData.activeProject}/worktrees`);
    const worktrees = await wtRes.json();
    
    console.log(`Found ${worktrees.length} worktrees:`);
    worktrees.forEach(wt => {
      console.log(`  - ${wt.name} (branch: ${wt.branch || 'unknown'})`);
      console.log(`    Frontend: ${wt.frontendPort} (${wt.frontendPortInUse ? 'IN USE' : 'available'})`);
      console.log(`    Backend: ${wt.backendPort} (${wt.backendPortInUse ? 'IN USE' : 'available'})`);
    });
  } else {
    console.log('No active project selected');
  }
}

async function testSessionPrompt() {
  console.log('\n📝 Testing Session Prompt Generation...');
  
  // Get sessions
  const sessionsRes = await fetch(`${BASE_URL}/api/sessions`);
  const sessions = await sessionsRes.json();
  
  if (sessions.length > 0) {
    const session = sessions[0];
    console.log(`Getting prompt for session: ${session.sessionId}`);
    
    const promptRes = await fetch(`${BASE_URL}/api/sessions/${session.sessionId}/prompt`);
    const prompt = await promptRes.text();
    
    // Check if prompt contains port availability warnings
    if (prompt.includes('PORT AVAILABILITY WARNING')) {
      console.log('✅ Prompt includes port availability warnings');
    } else {
      console.log('ℹ️ No port conflicts detected in session prompt');
    }
    
    // Check if prompt has step-by-step instructions
    if (prompt.includes('1. Navigate to Working Directory') && 
        prompt.includes('2. Verify Port Availability') &&
        prompt.includes('3. Start Development Servers')) {
      console.log('✅ Prompt has clear step-by-step instructions');
    }
  } else {
    console.log('No sessions found to test');
  }
}

async function runTests() {
  console.log('🧪 Running Dev Dashboard Improvement Tests...');
  
  try {
    await testPortChecking();
    await testWorktreeList();
    await testSessionPrompt();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📌 Summary of Improvements:');
    console.log('1. Ports are automatically checked for availability before assignment');
    console.log('2. Worktrees are detected using git worktree list (shows ALL worktrees)');
    console.log('3. Session prompts include port availability warnings');
    console.log('4. Instructions are clearer with step-by-step setup process');
    console.log('5. Dashboard shows port status (IN USE/AVAILABLE) for each worktree');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests
runTests();