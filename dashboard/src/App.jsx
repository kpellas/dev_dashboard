import React, { useState, useEffect } from 'react';
import ProjectSelector from './components/ProjectSelector';
import SprintManager from './components/SprintManager';
import WorktreeManager from './components/WorktreeManager';
import SessionManager from './components/SessionManager';
import QuickActions from './components/QuickActions';
import SessionHistory from './components/SessionHistory';
import './App.css';

function App() {
  const [projects, setProjects] = useState({});
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
    loadSessions();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data.projects);
      setActiveProject(data.activeProject);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const handleProjectChange = async (projectId) => {
    try {
      await fetch('/api/projects/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      setActiveProject(projectId);
      loadSessions();
    } catch (error) {
      console.error('Failed to switch project:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const currentProject = projects[activeProject];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Dev Dashboard
              </h1>
              <ProjectSelector
                projects={projects}
                activeProject={activeProject}
                onProjectChange={handleProjectChange}
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {sessions.filter(s => s.status === 'active').length} active sessions
              </span>
              <button
                onClick={loadSessions}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Actions Bar */}
      {currentProject && (
        <QuickActions
          project={currentProject}
          onActionComplete={() => {
            loadSessions();
            // Trigger other refreshes as needed
          }}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'sprints', 'worktrees', 'sessions', 'history'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm capitalize
                  ${activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && currentProject && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Overview Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {currentProject.icon} {currentProject.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentProject.description}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 text-xs font-medium rounded-full"
                    style={{ backgroundColor: `${currentProject.primaryColor}20`, color: currentProject.primaryColor }}
                  >
                    Active
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Repository:</span>
                    <span className="font-medium">{currentProject.repository || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Frontend Port:</span>
                    <span className="font-medium">{currentProject.settings.frontendPort}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Backend Port:</span>
                    <span className="font-medium">{currentProject.settings.apiPort}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Accessed:</span>
                    <span className="font-medium">
                      {new Date(currentProject.lastAccessed).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Sessions Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Sessions
                </h2>
                {sessions.filter(s => s.status === 'active' && s.projectId === activeProject).length > 0 ? (
                  <div className="space-y-3">
                    {sessions
                      .filter(s => s.status === 'active' && s.projectId === activeProject)
                      .map(session => (
                        <div key={session.sessionId} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{session.sprint}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {session.items} items • {session.worktree}
                              </p>
                            </div>
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              Active
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No active sessions</p>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {sessions
                    .filter(s => s.projectId === activeProject)
                    .slice(0, 5)
                    .map(session => (
                      <div key={session.sessionId} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center space-x-3">
                          <span className={`w-2 h-2 rounded-full ${
                            session.status === 'completed' ? 'bg-green-500' :
                            session.status === 'active' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`}></span>
                          <div>
                            <p className="text-sm font-medium">{session.sprint}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(session.created).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {session.items} items
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sprints' && currentProject && (
            <SprintManager project={currentProject} />
          )}

          {activeTab === 'worktrees' && currentProject && (
            <WorktreeManager project={currentProject} />
          )}

          {activeTab === 'sessions' && currentProject && (
            <SessionManager 
              project={currentProject}
              sessions={sessions.filter(s => s.projectId === activeProject)}
              onRefresh={loadSessions}
            />
          )}

          {activeTab === 'history' && (
            <SessionHistory 
              sessions={sessions}
              projects={projects}
              activeProject={activeProject}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;