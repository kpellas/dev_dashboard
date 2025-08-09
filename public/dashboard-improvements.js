// Improved dashboard functionality with click-to-edit for all tabs

let editingItemId = null;
let editingSprintId = null;
let editingWorktreeId = null;
let editingSessionId = null;
let expandedSprintId = null;
let editingCommentIndex = null;
// expandedSessionId is already declared in session-management.js

// Filtering and sorting state
let filterSettings = {
    status: 'all',
    type: 'all',
    priority: 'all',
    sprint: 'all',
    searchQuery: ''
};
let sortSettings = {
    field: 'updated',
    direction: 'desc'
};

function renderIdeasTab() {
    let items = window.ideas.items || [];
    
    // Apply filters
    items = items.filter(item => {
        // Don't show archived items by default
        if (item.status === 'archived' && filterSettings.status !== 'archived') return false;
        
        // Status filter
        if (filterSettings.status !== 'all') {
            if (filterSettings.status === 'active') {
                if (item.status === 'done' || item.status === 'archived' || item.status === 'closed') return false;
            } else if (filterSettings.status !== item.status) {
                return false;
            }
        }
        
        // Type filter
        if (filterSettings.type !== 'all' && item.type !== filterSettings.type) return false;
        
        // Priority filter
        if (filterSettings.priority !== 'all' && item.priority !== filterSettings.priority) return false;
        
        // Sprint filter
        if (filterSettings.sprint !== 'all') {
            const itemSprint = item.sprint || 'backlog';
            if (filterSettings.sprint === 'backlog' && item.sprint) return false;
            if (filterSettings.sprint !== 'backlog' && filterSettings.sprint !== itemSprint) return false;
        }
        
        // Search filter
        if (filterSettings.searchQuery) {
            const query = filterSettings.searchQuery.toLowerCase();
            const matchesSearch = 
                item.title?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.id?.toLowerCase().includes(query) ||
                item.tags?.some(tag => tag.toLowerCase().includes(query));
            if (!matchesSearch) return false;
        }
        
        return true;
    });
    
    // Apply sorting
    items.sort((a, b) => {
        let aVal, bVal;
        
        switch (sortSettings.field) {
            case 'priority':
                const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                aVal = priorityOrder[a.priority] || 0;
                bVal = priorityOrder[b.priority] || 0;
                break;
            case 'status':
                const statusOrder = { new: 1, in_progress: 2, review: 3, done: 4, closed: 5, archived: 6 };
                aVal = statusOrder[a.status] || 0;
                bVal = statusOrder[b.status] || 0;
                break;
            case 'title':
                aVal = a.title?.toLowerCase() || '';
                bVal = b.title?.toLowerCase() || '';
                break;
            case 'created':
                aVal = new Date(a.created || 0).getTime();
                bVal = new Date(b.created || 0).getTime();
                break;
            case 'updated':
            default:
                aVal = new Date(a.updated || a.created || 0).getTime();
                bVal = new Date(b.updated || b.created || 0).getTime();
                break;
        }
        
        if (sortSettings.direction === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });
    
    // Render filter controls
    const filterControls = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
            <div class="flex flex-wrap gap-2">
                <input type="text" 
                    id="searchFilter"
                    placeholder="Search..." 
                    value="${filterSettings.searchQuery}"
                    onkeyup="updateSearchFilter(this.value)"
                    class="px-3 py-1 text-sm border rounded flex-1 min-w-[200px]">
                
                <select id="statusFilter" onchange="updateFilter('status', this.value)" 
                    class="px-3 py-1 text-sm border rounded bg-white">
                    <option value="all">All Status</option>
                    <option value="active" ${filterSettings.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="new" ${filterSettings.status === 'new' ? 'selected' : ''}>New</option>
                    <option value="in_progress" ${filterSettings.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="review" ${filterSettings.status === 'review' ? 'selected' : ''}>Review</option>
                    <option value="done" ${filterSettings.status === 'done' ? 'selected' : ''}>Done</option>
                    <option value="closed" ${filterSettings.status === 'closed' ? 'selected' : ''}>Closed</option>
                    <option value="archived" ${filterSettings.status === 'archived' ? 'selected' : ''}>Archived</option>
                </select>
                
                <select id="typeFilter" onchange="updateFilter('type', this.value)" 
                    class="px-3 py-1 text-sm border rounded bg-white">
                    <option value="all">All Types</option>
                    <option value="bug" ${filterSettings.type === 'bug' ? 'selected' : ''}>Bug</option>
                    <option value="feature" ${filterSettings.type === 'feature' ? 'selected' : ''}>Feature</option>
                    <option value="task" ${filterSettings.type === 'task' ? 'selected' : ''}>Task</option>
                    <option value="idea" ${filterSettings.type === 'idea' ? 'selected' : ''}>Idea</option>
                </select>
                
                <select id="priorityFilter" onchange="updateFilter('priority', this.value)" 
                    class="px-3 py-1 text-sm border rounded bg-white">
                    <option value="all">All Priorities</option>
                    <option value="critical" ${filterSettings.priority === 'critical' ? 'selected' : ''}>Critical</option>
                    <option value="high" ${filterSettings.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${filterSettings.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${filterSettings.priority === 'low' ? 'selected' : ''}>Low</option>
                </select>
                
                <select id="sprintFilter" onchange="updateFilter('sprint', this.value)" 
                    class="px-3 py-1 text-sm border rounded bg-white">
                    <option value="all">All Sprints</option>
                    <option value="backlog" ${filterSettings.sprint === 'backlog' ? 'selected' : ''}>Backlog</option>
                    ${Object.keys(window.ideas.sprints || {}).map(name => 
                        `<option value="${name}" ${filterSettings.sprint === name ? 'selected' : ''}>${name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Sort by:</span>
                <select id="sortField" onchange="updateSort('field', this.value)" 
                    class="px-3 py-1 text-sm border rounded bg-white">
                    <option value="updated" ${sortSettings.field === 'updated' ? 'selected' : ''}>Last Updated</option>
                    <option value="created" ${sortSettings.field === 'created' ? 'selected' : ''}>Created</option>
                    <option value="priority" ${sortSettings.field === 'priority' ? 'selected' : ''}>Priority</option>
                    <option value="status" ${sortSettings.field === 'status' ? 'selected' : ''}>Status</option>
                    <option value="title" ${sortSettings.field === 'title' ? 'selected' : ''}>Title</option>
                </select>
                
                <button onclick="toggleSortDirection()" 
                    class="px-2 py-1 text-sm border rounded hover:bg-gray-100" 
                    title="Toggle sort direction">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${sortSettings.direction === 'asc' ? 
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>' :
                            '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"></path>'
                        }
                    </svg>
                </button>
                
                <span class="ml-auto text-sm text-gray-600">
                    Showing ${items.length} ${items.length === 1 ? 'item' : 'items'}
                </span>
                
                ${Object.values(filterSettings).some(v => v !== 'all' && v !== '') ? `
                    <button onclick="clearFilters()" 
                        class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">
                        Clear Filters
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    if (items.length === 0) {
        document.getElementById('ideasList').innerHTML = filterControls + 
            '<p class="text-gray-500 text-center py-8">No items match your filters</p>';
        return;
    }
    
    const itemsHtml = items.map(item => {
        const isEditing = editingItemId === item.id;
        
        if (isEditing) {
            // Edit mode - all fields are editable inline
            return `
                <div class="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                    <div class="space-y-3">
                        <div class="flex gap-2">
                            <select id="edit-type-${item.id}" class="px-2 py-1 text-sm border rounded">
                                <option value="bug" ${item.type === 'bug' ? 'selected' : ''}>Bug</option>
                                <option value="task" ${item.type === 'task' ? 'selected' : ''}>Task</option>
                                <option value="feature" ${item.type === 'feature' ? 'selected' : ''}>Feature</option>
                                <option value="idea" ${item.type === 'idea' ? 'selected' : ''}>Idea</option>
                            </select>
                            <select id="edit-priority-${item.id}" class="px-2 py-1 text-sm border rounded">
                                <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${item.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${item.priority === 'high' ? 'selected' : ''}>High</option>
                                <option value="critical" ${item.priority === 'critical' ? 'selected' : ''}>Critical</option>
                            </select>
                            <select id="edit-status-${item.id}" class="px-2 py-1 text-sm border rounded">
                                <option value="new" ${item.status === 'new' ? 'selected' : ''}>New</option>
                                <option value="in_progress" ${item.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="review" ${item.status === 'review' ? 'selected' : ''}>Review</option>
                                <option value="done" ${item.status === 'done' ? 'selected' : ''}>Done</option>
                                <option value="closed" ${item.status === 'closed' ? 'selected' : ''}>Closed</option>
                            </select>
                        </div>
                        <input id="edit-title-${item.id}" type="text" value="${item.title.replace(/"/g, '&quot;')}" 
                            class="w-full px-2 py-1 text-sm font-medium border rounded" 
                            placeholder="Title" />
                        <textarea id="edit-desc-${item.id}" rows="3" 
                            class="w-full px-2 py-1 text-sm border rounded"
                            placeholder="Description">${item.description || ''}</textarea>
                        <div class="flex gap-2">
                            <select id="edit-sprint-${item.id}" class="flex-1 px-2 py-1 text-sm border rounded">
                                <option value="">No Sprint (Backlog)</option>
                                ${Object.keys(window.ideas.sprints || {}).map(name => 
                                    `<option value="${name}" ${item.sprint === name ? 'selected' : ''}>${name}</option>`
                                ).join('')}
                            </select>
                            <input id="edit-effort-${item.id}" type="text" value="${item.effort || ''}" 
                                placeholder="Effort (e.g., 2h)" 
                                class="px-2 py-1 text-sm border rounded" />
                        </div>
                        <div class="flex justify-between">
                            <span class="text-xs text-gray-500">${item.id}</span>
                            <div class="flex gap-2">
                                <button onclick="cancelEdit()" 
                                    class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button onclick="saveItemChanges('${item.id}')" 
                                    class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // View mode - click anywhere on the card to edit
            // Use subtle, muted colors
            const priorityColor = 
                item.priority === 'critical' ? 'bg-red-50 text-red-700' :
                item.priority === 'high' ? 'bg-orange-50 text-orange-700' :
                'bg-gray-50 text-gray-600';
            
            const statusColor = 
                item.status === 'done' ? 'bg-green-50 text-green-700' :
                item.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                'bg-gray-50 text-gray-600';
            
            const typeColor = 
                item.type === 'bug' ? 'bg-red-50 text-red-700' :
                'bg-gray-50 text-gray-700';
            
            return `
                <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div onclick="startEdit('${item.id}')" class="cursor-pointer" title="Click to edit">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs font-medium px-2 py-1 ${typeColor} rounded">
                                ${item.type}
                            </span>
                            <span class="text-xs px-2 py-1 ${priorityColor} rounded">
                                ${item.priority}
                            </span>
                            <span class="text-xs px-2 py-0.5 ${statusColor} rounded">
                                ${item.status || 'new'}
                            </span>
                            <span class="text-xs text-gray-400 ml-auto">
                                ${item.id}
                            </span>
                        </div>
                        <p class="font-medium text-sm mb-1">${item.title}</p>
                        <p class="text-xs text-gray-600">${item.description ? 
                            (item.description.length > 150 ? 
                                item.description.substring(0, 150) + '...' : 
                                item.description) : 
                            'No description'}</p>
                        <div class="flex items-center gap-3 mt-3 text-xs text-gray-500">
                            <span>Sprint: <span class="font-medium">${item.sprint || 'Backlog'}</span></span>
                            ${item.effort ? `<span>Effort: <span class="font-medium">${item.effort}</span></span>` : ''}
                        </div>
                        
                        <!-- Comments Section -->
                        ${item.comments && item.comments.length > 0 ? `
                            <div class="mt-3 pt-3 border-t">
                                <div class="text-xs font-medium text-gray-600 mb-1">Comments (${item.comments.length})</div>
                                <div class="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded">
                                    ${item.comments.map((c, idx) => {
                                        const isEditingComment = editingItemId === item.id && editingCommentIndex === idx;
                                        return isEditingComment ? `
                                            <div class="text-xs bg-yellow-50 p-2 rounded border-2 border-yellow-300" onclick="event.stopPropagation()">
                                                <textarea id="edit-comment-${item.id}-${idx}" 
                                                    class="w-full px-2 py-1 text-xs border rounded" 
                                                    rows="2">${c.text}</textarea>
                                                <div class="flex justify-end gap-1 mt-1">
                                                    <button onclick="cancelCommentEdit()" 
                                                        class="px-2 py-0.5 text-xs border rounded hover:bg-gray-100">
                                                        Cancel
                                                    </button>
                                                    <button onclick="saveCommentEdit('${item.id}', ${idx})" 
                                                        class="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        ` : `
                                            <div class="text-xs bg-white p-2 rounded border group hover:bg-gray-50">
                                                <div class="flex justify-between items-start">
                                                    <span class="text-gray-500">${new Date(c.timestamp).toLocaleString()}</span>
                                                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onclick="event.stopPropagation()">
                                                        <button onclick="startCommentEdit('${item.id}', ${idx})" 
                                                            class="text-gray-500 hover:text-gray-700" title="Edit">
                                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                            </svg>
                                                        </button>
                                                        <button onclick="deleteComment('${item.id}', ${idx})" 
                                                            class="text-gray-500 hover:text-gray-700" title="Delete">
                                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div class="mt-1 text-gray-800 break-words">${c.text}</div>
                                                ${c.edited ? `<div class="text-[10px] text-gray-400 mt-1">edited</div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- Add Comment -->
                        <div class="mt-2" onclick="event.stopPropagation()">
                            <div class="flex gap-1">
                                <input type="text" 
                                    id="comment-${item.id}" 
                                    placeholder="Add comment..." 
                                    class="flex-1 px-2 py-1 text-xs border rounded"
                                    onclick="event.stopPropagation()"
                                    onkeypress="if(event.key==='Enter') { event.stopPropagation(); addComment('${item.id}'); }">
                                <button onclick="event.stopPropagation(); addComment('${item.id}')" 
                                    class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t flex justify-between" onclick="event.stopPropagation()">
                        ${item.status !== 'closed' && item.status !== 'archived' ? `
                            <button onclick="event.stopPropagation(); closeItem('${item.id}')" 
                                class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
                                Close Item
                            </button>
                        ` : 
                        item.status === 'closed' ? `
                            <button onclick="event.stopPropagation(); reopenItem('${item.id}')" 
                                class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                                Reopen Item
                            </button>
                        ` : '<div></div>'}
                        <select onclick="event.stopPropagation()" onchange="handleSprintMove('${item.id}', this.value); this.value='';" 
                            class="px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50">
                            <option value="">Move to Sprint...</option>
                            <option value="backlog">Backlog</option>
                            ${Object.keys(window.ideas.sprints || {}).map(name => 
                                `<option value="${name}">${name}</option>`
                            ).join('')}
                            <option value="__new__">+ Create New Sprint</option>
                        </select>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    // Add filter controls and items to the page
    document.getElementById('ideasList').innerHTML = filterControls + itemsHtml;
}

function startEdit(itemId) {
    editingItemId = itemId;
    renderIdeasTab();
}

function cancelEdit() {
    editingItemId = null;
    renderIdeasTab();
}

async function saveItemChanges(itemId) {
    const item = window.ideas.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Check if activeProject is defined
    if (!window.activeProject) {
        alert('No active project selected. Please select a project first.');
        return;
    }
    
    // Get all edited values
    const newType = document.getElementById(`edit-type-${itemId}`).value;
    const newTitle = document.getElementById(`edit-title-${itemId}`).value;
    const newDesc = document.getElementById(`edit-desc-${itemId}`).value;
    const newPriority = document.getElementById(`edit-priority-${itemId}`).value;
    const newStatus = document.getElementById(`edit-status-${itemId}`).value;
    const newSprint = document.getElementById(`edit-sprint-${itemId}`).value;
    const newEffort = document.getElementById(`edit-effort-${itemId}`).value;
    
    if (!newTitle.trim()) {
        alert('Title is required');
        return;
    }
    
    // Update item
    item.type = newType;
    item.title = newTitle.trim();
    item.description = newDesc.trim();
    item.priority = newPriority;
    item.status = newStatus;
    item.sprint = newSprint || null;
    item.effort = newEffort.trim();
    item.updated = new Date().toISOString();
    
    // Save to server
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        editingItemId = null;
        renderIdeasTab();
        updateSprints();
        updateOverview();
    } catch (error) {
        alert('Failed to save changes: ' + error.message);
    }
}

async function addComment(itemId) {
    console.log('addComment called with itemId:', itemId, 'type:', typeof itemId);
    console.log('window.ideas.items:', window.ideas.items);
    console.log('window.activeProject:', window.activeProject);
    
    // Convert itemId to match the type used in the data
    // If the ID in data is a number, convert string to number
    const item = window.ideas.items.find(i => {
        console.log('Comparing:', i.id, '(type:', typeof i.id, ') with', itemId, '(type:', typeof itemId, ')');
        // Compare both as strings and as numbers to handle both cases
        return i.id == itemId || i.id === itemId || i.id === parseInt(itemId) || String(i.id) === String(itemId);
    });
    
    console.log('Found item:', item);
    if (!item) {
        console.error('Item not found for ID:', itemId);
        alert('Error: Could not find item with ID ' + itemId);
        return;
    }
    
    const commentInput = document.getElementById(`comment-${itemId}`);
    console.log('Comment input element:', commentInput);
    if (!commentInput) {
        console.error('Comment input not found for ID:', `comment-${itemId}`);
        alert('Error: Comment input field not found');
        return;
    }
    
    const commentText = commentInput.value.trim();
    console.log('Comment text:', commentText);
    
    if (!commentText) {
        console.log('No comment text entered');
        return;
    }
    
    // Check if activeProject is defined
    if (!window.activeProject) {
        alert('No active project selected. Please select a project first.');
        return;
    }
    
    // Initialize comments array if it doesn't exist
    if (!item.comments) {
        item.comments = [];
    }
    
    // Add timestamped comment
    item.comments.push({
        text: commentText,
        timestamp: new Date().toISOString(),
        user: 'User' // Could be enhanced with actual user info
    });
    
    // Update timestamp
    item.updated = new Date().toISOString();
    
    // Save to server
    console.log('Saving to server...');
    console.log('API URL:', `/api/projects/${window.activeProject}/ideas`);
    console.log('Data being sent:', window.ideas);
    
    try {
        const res = await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        console.log('Server response status:', res.status, res.ok);
        
        if (res.ok) {
            console.log('Comment saved successfully');
            commentInput.value = '';
            
            // Reload ideas from server to get the updated data
            console.log('Reloading ideas from server...');
            try {
                const ideasRes = await fetch(`/api/projects/${window.activeProject}/ideas`);
                if (ideasRes.ok) {
                    window.ideas = await ideasRes.json();
                    console.log('Ideas reloaded successfully:', window.ideas);
                    renderIdeasTab();
                } else {
                    console.error('Failed to reload ideas');
                    // Still try to render with existing data
                    renderIdeasTab();
                }
            } catch (reloadError) {
                console.error('Error reloading ideas:', reloadError);
                // Still try to render with existing data
                renderIdeasTab();
            }
        } else {
            console.error('Server returned error:', res.status);
            const errorText = await res.text();
            console.error('Error details:', errorText);
            alert('Server error: ' + res.status);
        }
    } catch (error) {
        console.error('Failed to add comment:', error);
        alert('Failed to add comment: ' + error.message);
    }
}

async function handleSprintMove(itemId, sprintValue) {
    if (!sprintValue) return;
    
    const item = window.ideas.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Check if activeProject is defined
    if (!window.activeProject) {
        alert('No active project selected. Please select a project first.');
        renderIdeasTab(); // Reset dropdown
        return;
    }
    
    if (sprintValue === '__new__') {
        // Show create sprint modal
        const sprintName = prompt('Enter new sprint name:');
        if (!sprintName) {
            renderIdeasTab(); // Reset dropdown
            return;
        }
        
        if (!window.ideas.sprints) window.ideas.sprints = {};
        
        if (window.ideas.sprints[sprintName]) {
            alert('A sprint with this name already exists');
            renderIdeasTab();
            return;
        }
        
        // Create the new sprint
        window.ideas.sprints[sprintName] = {
            name: sprintName,
            description: '',
            start: new Date().toISOString().split('T')[0],
            end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            goals: [],
            status: 'active',
            created: new Date().toISOString()
        };
        
        // Assign item to the new sprint
        item.sprint = sprintName;
    } else {
        // Move to existing sprint or backlog
        item.sprint = sprintValue === 'backlog' ? null : sprintValue;
    }
    
    item.updated = new Date().toISOString();
    
    // Save changes
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        renderIdeasTab();
        if (typeof updateSprints === 'function') updateSprints();
        if (typeof updateOverview === 'function') updateOverview();
    } catch (error) {
        alert('Failed to move item: ' + error.message);
    }
}

// Sprints tab functionality
function renderSprintsTab() {
    if (!window.ideas.sprints) {
        document.getElementById('sprintsList').innerHTML = '<p class="text-gray-500">No sprints yet</p>';
        return;
    }
    
    document.getElementById('sprintsList').innerHTML = Object.entries(window.ideas.sprints).map(([name, sprint]) => {
        const items = window.ideas.items?.filter(i => i.sprint === name) || [];
        const todoItems = items.filter(i => i.status !== 'done');
        const doneItems = items.filter(i => i.status === 'done');
        const assignment = sprintAssignments[name];
        const isEditing = editingSprintId === name;
        const isExpanded = expandedSprintId === name;
        
        if (isEditing) {
            // Edit mode for sprint
            return `
                <div class="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                    <div class="space-y-3">
                        <input id="edit-sprint-name-${name}" type="text" value="${name}" 
                            class="w-full px-2 py-1 text-lg font-medium border rounded" 
                            placeholder="Sprint Name" />
                        <textarea id="edit-sprint-desc-${name}" rows="2" 
                            class="w-full px-2 py-1 text-sm border rounded"
                            placeholder="Sprint description...">${sprint.description || ''}</textarea>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-xs text-gray-600">Start Date</label>
                                <input id="edit-sprint-start-${name}" type="date" 
                                    value="${sprint.start || ''}" 
                                    class="w-full px-2 py-1 text-sm border rounded" />
                            </div>
                            <div>
                                <label class="text-xs text-gray-600">End Date</label>
                                <input id="edit-sprint-end-${name}" type="date" 
                                    value="${sprint.end || ''}" 
                                    class="w-full px-2 py-1 text-sm border rounded" />
                            </div>
                        </div>
                        <div>
                            <label class="text-xs text-gray-600">Goals (one per line)</label>
                            <textarea id="edit-sprint-goals-${name}" rows="3" 
                                class="w-full px-2 py-1 text-sm border rounded"
                                placeholder="Goal 1\nGoal 2">${(sprint.goals || []).join('\n')}</textarea>
                        </div>
                        <div class="flex justify-between">
                            <button onclick="deleteSprint('${name}')" 
                                class="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50">
                                Delete Sprint
                            </button>
                            <div class="flex gap-2">
                                <button onclick="cancelSprintEdit()" 
                                    class="px-3 py-1 text-sm border rounded hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button onclick="saveSprintChanges('${name}')" 
                                    class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // View mode for sprint
            return `
                <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div onclick="startSprintEdit('${name}')" class="cursor-pointer" title="Click to edit">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <p class="font-medium text-lg">${name}</p>
                                <p class="text-sm text-gray-600 mt-1">${sprint.description || 'No description'}</p>
                                <div class="flex gap-3 mt-2">
                                    <span class="text-xs text-gray-600">
                                        Todo: <span class="font-bold">${todoItems.length}</span>
                                    </span>
                                    <span class="text-xs text-gray-600">
                                        Done: <span class="font-bold">${doneItems.length}</span>
                                    </span>
                                    <span class="text-xs text-gray-600">
                                        Total: <span class="font-bold">${items.length}</span>
                                    </span>
                                    ${sprint.start ? `<span class="text-xs text-gray-500">${sprint.start} to ${sprint.end || '...'}</span>` : ''}
                                </div>
                                ${assignment ? `
                                    <div class="mt-2 p-2 bg-green-50 rounded">
                                        <span class="text-xs text-green-700">
                                            Assigned to worktree: <strong>${assignment.worktree}</strong>
                                        </span>
                                    </div>
                                ` : `
                                    <div class="mt-2 p-2 bg-gray-50 rounded">
                                        <span class="text-xs text-gray-600">
                                            Not assigned to any worktree
                                        </span>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sprint Items List -->
                    ${items.length > 0 ? `
                        <div class="mt-3 pt-3 border-t">
                            <button onclick="toggleSprintItems('${name}')" 
                                class="text-xs text-gray-600 hover:text-gray-800 mb-2">
                                <svg class="inline-block w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
                                </svg>
                                Show Items (${items.length})
                            </button>
                            ${isExpanded ? `
                                <div class="space-y-1 mt-2">
                                    ${items.map(item => `
                                        <div class="flex items-center gap-2 text-xs p-1 rounded ${
                                            item.status === 'done' ? 'bg-green-50 line-through' : 'bg-white'
                                        }">
                                            <span class="font-mono text-gray-500">${item.id}</span>
                                            <span class="${
                                                item.type === 'bug' ? 'text-red-600' : 
                                                item.type === 'feature' ? 'text-purple-600' : 
                                                'text-gray-600'
                                            }">${item.type}</span>
                                            <span>${item.title}</span>
                                            <span class="ml-auto text-gray-500">${item.status || 'new'}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="mt-3 pt-3 border-t flex justify-end">
                        <button onclick="assignSprintToWorktree('${name}')" 
                            class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                            ${assignment ? 'Reassign' : 'Assign'} to Worktree
                        </button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function startSprintEdit(sprintName) {
    editingSprintId = sprintName;
    renderSprintsTab();
}

function cancelSprintEdit() {
    editingSprintId = null;
    renderSprintsTab();
}

async function saveSprintChanges(oldName) {
    const sprint = window.ideas.sprints[oldName];
    if (!sprint) return;
    
    const newName = document.getElementById(`edit-sprint-name-${oldName}`).value.trim();
    const newDesc = document.getElementById(`edit-sprint-desc-${oldName}`).value.trim();
    const newStart = document.getElementById(`edit-sprint-start-${oldName}`).value;
    const newEnd = document.getElementById(`edit-sprint-end-${oldName}`).value;
    const goalsText = document.getElementById(`edit-sprint-goals-${oldName}`).value;
    const newGoals = goalsText.split('\n').map(g => g.trim()).filter(g => g);
    
    if (!newName) {
        alert('Sprint name is required');
        return;
    }
    
    // If name changed, update the sprint key
    if (newName !== oldName) {
        window.ideas.sprints[newName] = sprint;
        delete window.ideas.sprints[oldName];
        
        // Update all items that reference this sprint
        window.ideas.items?.forEach(item => {
            if (item.sprint === oldName) {
                item.sprint = newName;
            }
        });
        
        // Update sprint assignments
        if (sprintAssignments[oldName]) {
            sprintAssignments[newName] = sprintAssignments[oldName];
            delete sprintAssignments[oldName];
            localStorage.setItem(`sprint-assignments-${window.activeProject}`, JSON.stringify(sprintAssignments));
        }
    }
    
    // Update sprint properties
    sprint.name = newName;
    sprint.description = newDesc;
    sprint.start = newStart;
    sprint.end = newEnd;
    sprint.goals = newGoals;
    sprint.updated = new Date().toISOString();
    
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        editingSprintId = null;
        renderSprintsTab();
        renderIdeasTab();
        if (typeof updateOverview === 'function') updateOverview();
    } catch (error) {
        alert('Failed to save sprint changes: ' + error.message);
    }
}

async function deleteSprint(sprintName) {
    if (!confirm(`Delete sprint "${sprintName}"? Items will be moved to backlog.`)) {
        return;
    }
    
    // Move all items in this sprint to backlog
    window.ideas.items?.forEach(item => {
        if (item.sprint === sprintName) {
            item.sprint = null;
            item.updated = new Date().toISOString();
        }
    });
    
    // Delete the sprint
    delete window.ideas.sprints[sprintName];
    
    // Remove sprint assignments
    if (sprintAssignments[sprintName]) {
        delete sprintAssignments[sprintName];
        localStorage.setItem(`sprint-assignments-${window.activeProject}`, JSON.stringify(sprintAssignments));
    }
    
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        editingSprintId = null;
        renderSprintsTab();
        renderIdeasTab();
        if (typeof updateOverview === 'function') updateOverview();
    } catch (error) {
        alert('Failed to delete sprint: ' + error.message);
    }
}

// Worktrees tab functionality
function renderWorktreesTab() {
    document.getElementById('worktreesList').innerHTML = worktrees.length > 0
        ? worktrees.map(wt => {
            const assignedSprints = Object.entries(sprintAssignments)
                .filter(([sprint, assignment]) => assignment.worktree === wt.name)
                .map(([sprint]) => sprint);
            const isEditing = editingWorktreeId === wt.name;
            
            if (isEditing) {
                // Edit mode for worktree
                return `
                    <div class="border-2 border-blue-500 rounded-lg p-4 bg-blue-50">
                        <div class="space-y-3">
                            <input id="edit-wt-name-${wt.name}" type="text" value="${wt.name}" 
                                class="w-full px-2 py-1 text-lg font-medium border rounded" 
                                placeholder="Branch Name" disabled />
                            <textarea id="edit-wt-desc-${wt.name}" rows="2" 
                                class="w-full px-2 py-1 text-sm border rounded"
                                placeholder="Description...">${wt.description || ''}</textarea>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs text-gray-600">Frontend Port</label>
                                    <input id="edit-wt-frontend-${wt.name}" type="number" 
                                        value="${wt.frontendPort || ''}" 
                                        class="w-full px-2 py-1 text-sm border rounded" />
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600">Backend Port</label>
                                    <input id="edit-wt-backend-${wt.name}" type="number" 
                                        value="${wt.backendPort || ''}" 
                                        class="w-full px-2 py-1 text-sm border rounded" />
                                </div>
                            </div>
                            <div class="flex justify-end gap-2">
                                <button onclick="cancelWorktreeEdit()" 
                                    class="px-3 py-1 text-sm border rounded hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button onclick="saveWorktreeChanges('${wt.name}')" 
                                    class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // View mode for worktree
                return `
                    <div class="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div>
                            <div class="flex justify-between items-start mb-3">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <p class="font-medium text-lg cursor-pointer" onclick="startWorktreeEdit('${wt.name}')" title="Click to edit">${wt.name}</p>
                                        ${wt.gitStatus ? 
                                            wt.gitStatus.hasChanges ? 
                                                `<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                                    ${wt.gitStatus.uncommittedChanges} uncommitted
                                                </span>` : 
                                                '<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Clean</span>'
                                            : ''
                                        }
                                    </div>
                                    <p class="text-sm text-gray-600 mt-1">${wt.description || 'No description'}</p>
                                    ${wt.gitStatus?.branch ? `<p class="text-xs text-gray-500">Branch: ${wt.gitStatus.branch}</p>` : ''}
                                    ${wt.gitStatus?.lastCommit ? `<p class="text-xs text-gray-500">Last: ${wt.gitStatus.lastCommit}</p>` : ''}
                                    
                                    ${wt.gitStatus?.hasChanges ? `
                                        <details class="mt-2 text-xs" onclick="event.stopPropagation()">
                                            <summary class="cursor-pointer text-blue-600 hover:text-blue-800">
                                                View ${wt.gitStatus.uncommittedChanges} uncommitted changes
                                            </summary>
                                            <div class="mt-1 p-2 bg-gray-50 rounded max-h-32 overflow-y-auto">
                                                ${wt.gitStatus.modifiedFiles.slice(0, 10).map(file => `
                                                    <div class="flex items-center gap-1">
                                                        <span class="text-gray-500">${
                                                            file.status === 'M' ? 
                                                                '<svg class="inline-block w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3"></circle></svg>' :
                                                            file.status === 'A' ? 
                                                                '<svg class="inline-block w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20"><path d="M10 5v10M5 10h10"></path></svg>' :
                                                            file.status === 'D' ? 
                                                                '<svg class="inline-block w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20"><path d="M5 10h10"></path></svg>' :
                                                            file.status === '??' ? 
                                                                '<svg class="inline-block w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20"><path d="M10 9v2m0 4h.01M10 3a7 7 0 100 14 7 7 0 000-14z"></path></svg>' : 
                                                                '<svg class="inline-block w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3"></circle></svg>'
                                                        }</span>
                                                        <span>${file.path}</span>
                                                    </div>
                                                `).join('')}
                                                ${wt.gitStatus.modifiedFiles.length > 10 ? 
                                                    `<div class="text-gray-500 mt-1">... and ${wt.gitStatus.modifiedFiles.length - 10} more</div>` : ''}
                                            </div>
                                        </details>
                                    ` : ''}
                                    
                                    <div class="mt-3 space-y-2">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span>Frontend: localhost:${wt.frontendPort || '?'}</span>
                                                ${wt.frontendPortInUse ? 
                                                    '<span class="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">Running</span>' : 
                                                    '<span class="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Stopped</span>'
                                                }
                                                ${wt.frontendPortInUse ? `
                                                    <button onclick="stopServer('${wt.name}', 'frontend', ${wt.frontendPort})" 
                                                        class="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                                                        Stop
                                                    </button>
                                                    <button onclick="restartServer('${wt.name}', 'frontend', ${wt.frontendPort})" 
                                                        class="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                        Restart
                                                    </button>` : 
                                                    `<button onclick="startServer('${wt.name}', 'frontend', ${wt.frontendPort})" 
                                                        class="px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                                                        Start
                                                    </button>`
                                                }
                                            </div>
                                            ${window.serverStatus?.[wt.name]?.frontend?.status === 'error' ? `
                                                <div class="text-xs text-red-600 mt-1 ml-4">
                                                    <svg class="inline-block w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    ${window.serverStatus[wt.name].frontend.message}
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span>Backend: localhost:${wt.backendPort || '?'}</span>
                                                ${wt.backendPortInUse ? 
                                                    '<span class="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">Running</span>' : 
                                                    '<span class="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">Stopped</span>'
                                                }
                                                ${wt.backendPortInUse ? `
                                                    <button onclick="stopServer('${wt.name}', 'backend', ${wt.backendPort})" 
                                                        class="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                                                        Stop
                                                    </button>
                                                    <button onclick="restartServer('${wt.name}', 'backend', ${wt.backendPort})" 
                                                        class="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                                                        Restart
                                                    </button>` : 
                                                    `<button onclick="startServer('${wt.name}', 'backend', ${wt.backendPort})" 
                                                        class="px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600">
                                                        Start
                                                    </button>`
                                                }
                                            </div>
                                            ${window.serverStatus?.[wt.name]?.backend?.status === 'error' ? `
                                                <div class="text-xs text-red-600 mt-1 ml-4">
                                                    <svg class="inline-block w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                                    </svg>
                                                    ${window.serverStatus[wt.name].backend.message}
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    ${assignedSprints.length > 0 ? `
                                        <div class="mt-3 p-2 bg-blue-50 rounded">
                                            <p class="text-xs font-medium text-blue-700 mb-1">Assigned Sprints:</p>
                                            ${assignedSprints.map(s => `
                                                <span class="inline-block px-2 py-1 text-xs bg-white rounded mr-1 mb-1">
                                                    ${s}
                                                </span>
                                            `).join('')}
                                        </div>
                                    ` : `
                                        <div class="mt-3 p-2 bg-gray-50 rounded">
                                            <p class="text-xs text-gray-600">No sprints assigned</p>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>
                        <div class="mt-3 pt-3 border-t flex justify-between">
                            ${wt.gitStatus?.hasChanges ? `
                                <div class="text-xs text-amber-600 flex items-center gap-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Commit changes to enable deletion
                                </div>
                            ` : `
                                <button onclick="archiveWorktree('${wt.name}')" 
                                    class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                                    title="Archive this worktree (removes directory but keeps branch)">
                                    Archive
                                </button>
                            `}
                            ${assignedSprints.length > 0 ? `
                                <button onclick="createSessionForWorktree('${wt.name}')" 
                                    class="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                                    Create Session
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
        }).join('')
        : '<p class="text-gray-500">No worktrees yet</p>';
}

function startWorktreeEdit(worktreeName) {
    editingWorktreeId = worktreeName;
    renderWorktreesTab();
}

function cancelWorktreeEdit() {
    editingWorktreeId = null;
    renderWorktreesTab();
}

async function saveWorktreeChanges(worktreeName) {
    const wt = worktrees.find(w => w.name === worktreeName);
    if (!wt) return;
    
    const newDesc = document.getElementById(`edit-wt-desc-${worktreeName}`).value.trim();
    const newFrontendPort = document.getElementById(`edit-wt-frontend-${worktreeName}`).value;
    const newBackendPort = document.getElementById(`edit-wt-backend-${worktreeName}`).value;
    
    // Update worktree config
    const config = {
        branchName: wt.name,
        description: newDesc,
        frontendPort: parseInt(newFrontendPort) || wt.frontendPort,
        backendPort: parseInt(newBackendPort) || wt.backendPort,
        created: wt.created || new Date().toISOString(),
        updated: new Date().toISOString()
    };
    
    try {
        // Save config to worktree directory
        const project = projects[window.activeProject];
        if (project) {
            await fetch('/api/worktree-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectPath: project.path,
                    worktreeName: worktreeName,
                    config: config
                })
            });
        }
        
        // Update local worktree data
        Object.assign(wt, config);
        
        editingWorktreeId = null;
        renderWorktreesTab();
    } catch (error) {
        alert('Failed to save worktree changes: ' + error.message);
    }
}

// Sessions tab functionality - use enhanced version with tabs
function renderSessionsTab() {
    const projectSessions = sessions.filter(s => s.projectId === window.activeProject);
    
    // PRIMARY: Use renderEnhancedSessionCardWithTabs from session-enhanced.js
    // This has the tabs (Overview/Start/Complete) and full session management
    if (typeof renderEnhancedSessionCardWithTabs === 'function') {
        document.getElementById('sessionsList').innerHTML = projectSessions.length > 0
            ? projectSessions.map(session => renderEnhancedSessionCardWithTabs(session)).join('')
            : '<p class="text-gray-500 text-sm">No sessions yet. Create a session from a worktree with an assigned sprint.</p>';
        return;
    }
    
    // Fallback to basic enhanced card
    if (typeof renderEnhancedSessionCard === 'function') {
        document.getElementById('sessionsList').innerHTML = projectSessions.length > 0
            ? projectSessions.map(session => renderEnhancedSessionCard(session)).join('')
            : '<p class="text-gray-500 text-sm">No sessions yet. Create a session from a worktree with an assigned sprint.</p>';
        return;
    }
    
    // Fallback to basic rendering
    document.getElementById('sessionsList').innerHTML = projectSessions.length > 0
        ? projectSessions.map(session => {
            const statusColor = 
                session.status === 'completed' ? 'bg-green-50 text-green-700' :
                session.status === 'active' ? 'bg-blue-50 text-blue-700' :
                'bg-gray-50 text-gray-700';
            
            return `
                <div class="border rounded-lg p-4 hover:bg-gray-50">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-medium text-sm font-mono">${session.sessionId}</p>
                            <p class="text-sm text-gray-600 mt-1">
                                Sprint: ${session.sprint} • Worktree: ${session.worktree}
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                ${session.items} items • ${new Date(session.created).toLocaleString()}
                            </p>
                        </div>
                        <span class="px-2 py-1 text-xs ${statusColor} rounded">
                            ${session.status}
                        </span>
                    </div>
                </div>
            `;
        }).join('')
        : '<p class="text-gray-500 text-sm">No sessions yet</p>';
}

function startSessionEdit(sessionId) {
    editingSessionId = sessionId;
    renderSessionsTab();
}

function cancelSessionEdit() {
    editingSessionId = null;
    renderSessionsTab();
}

async function saveSessionChanges(sessionId) {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;
    
    const newStatus = document.getElementById(`edit-session-status-${sessionId}`).value;
    const newNotes = document.getElementById(`edit-session-notes-${sessionId}`).value.trim();
    
    // Update session
    session.status = newStatus;
    session.notes = newNotes;
    session.updated = new Date().toISOString();
    
    try {
        // Save session file
        const sessionsPath = path.join(__dirname, 'sessions');
        await fetch('/api/session-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionId,
                updates: {
                    status: newStatus,
                    notes: newNotes,
                    updated: session.updated
                }
            })
        });
        
        editingSessionId = null;
        renderSessionsTab();
    } catch (error) {
        alert('Failed to save session changes: ' + error.message);
    }
}

async function deleteSession(sessionId) {
    if (!confirm(`Delete session ${sessionId}?`)) {
        return;
    }
    
    try {
        await fetch(`/api/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        
        // Remove from local sessions array
        const index = sessions.findIndex(s => s.sessionId === sessionId);
        if (index > -1) {
            sessions.splice(index, 1);
        }
        
        editingSessionId = null;
        renderSessionsTab();
    } catch (error) {
        alert('Failed to delete session: ' + error.message);
    }
}

// Export functions to be used in main dashboard
window.renderIdeasTab = renderIdeasTab;
window.startEdit = startEdit;
window.cancelEdit = cancelEdit;
window.saveItemChanges = saveItemChanges;
window.addComment = addComment;
window.handleSprintMove = handleSprintMove;
window.renderSprintsTab = renderSprintsTab;
window.startSprintEdit = startSprintEdit;
window.cancelSprintEdit = cancelSprintEdit;
window.saveSprintChanges = saveSprintChanges;
window.deleteSprint = deleteSprint;
window.renderWorktreesTab = renderWorktreesTab;
window.startWorktreeEdit = startWorktreeEdit;
window.cancelWorktreeEdit = cancelWorktreeEdit;
window.saveWorktreeChanges = saveWorktreeChanges;
window.renderSessionsTab = renderSessionsTab;
window.startSessionEdit = startSessionEdit;
window.cancelSessionEdit = cancelSessionEdit;
window.saveSessionChanges = saveSessionChanges;
window.deleteSession = deleteSession;

// Helper functions
function toggleSprintItems(sprintName) {
    expandedSprintId = expandedSprintId === sprintName ? null : sprintName;
    renderSprintsTab();
}

// Worktree and server management functions
async function archiveWorktree(worktreeName) {
    const worktree = worktrees.find(wt => wt.name === worktreeName);
    if (!worktree) {
        alert('Worktree not found');
        return;
    }
    
    // Check if worktree has uncommitted changes
    if (worktree.gitStatus?.hasChanges) {
        const forceDelete = confirm(
            `Warning: Worktree "${worktreeName}" has uncommitted changes!\n\n` +
            `Do you want to force delete it anyway?\n` +
            `This will PERMANENTLY DELETE any uncommitted changes.`
        );
        
        if (!forceDelete) {
            alert('To safely delete this worktree:\n' +
                  '1. Commit your changes: git add . && git commit -m "your message"\n' +
                  '2. Or stash them: git stash\n' +
                  '3. Then try deleting again');
            return;
        }
    }
    
    // Confirmation dialog
    const message = `Are you sure you want to archive the worktree "${worktreeName}"?\n\n` +
                   `This will:\n` +
                   `• Remove the worktree directory\n` +
                   `• Keep the branch "${worktree.branch || worktreeName}" in git\n` +
                   `• Free up ports ${worktree.frontendPort} and ${worktree.backendPort}\n\n` +
                   `You can recreate the worktree later from the branch if needed.`;
    
    if (!confirm(message)) {
        return;
    }
    
    try {
        const url = new URL(`/api/projects/${window.activeProject}/worktrees/${worktreeName}`, window.location.origin);
        if (worktree.gitStatus?.hasChanges) {
            url.searchParams.append('force', 'true');
        }
        
        const response = await fetch(url, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert(`Worktree "${worktreeName}" has been archived successfully.`);
            
            // Reload worktrees
            await loadProjectData(window.activeProject);
            renderWorktreesTab();
        } else {
            const error = await response.json();
            alert(`Failed to archive worktree: ${error.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error archiving worktree:', error);
        alert('Failed to archive worktree: ' + error.message);
    }
}

async function startServer(worktreeName, serverType, port) {
    const worktree = worktrees.find(wt => wt.name === worktreeName);
    if (!worktree) {
        alert('Worktree not found');
        return;
    }
    
    try {
        const command = serverType === 'frontend' 
            ? `npm run dev -- --port ${port}`
            : `PORT=${port} npm run server`;
            
        const response = await fetch('/api/start-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                worktreeName,
                worktreePath: worktree.path,
                serverType,
                port,
                command
            })
        });
        
        const result = await response.json();
        
        // Store server status globally
        if (!window.serverStatus) window.serverStatus = {};
        if (!window.serverStatus[worktreeName]) window.serverStatus[worktreeName] = {};
        
        if (result.success) {
            window.serverStatus[worktreeName][serverType] = { status: 'starting', message: null };
            alert(`${serverType} server starting on port ${port}...\n\nIt may take a few seconds to fully start.`);
            
            // Reload worktrees after a delay to show updated status
            setTimeout(async () => {
                await loadProjectData(window.activeProject);
                renderWorktreesTab();
            }, 3000);
        } else {
            window.serverStatus[worktreeName][serverType] = { status: 'error', message: result.error || 'Unknown error' };
            renderWorktreesTab(); // Re-render immediately to show error
            alert(`Failed to start ${serverType} server: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error starting server:', error);
        // Store error status
        if (!window.serverStatus) window.serverStatus = {};
        if (!window.serverStatus[worktreeName]) window.serverStatus[worktreeName] = {};
        window.serverStatus[worktreeName][serverType] = { status: 'error', message: error.message };
        renderWorktreesTab(); // Re-render immediately to show error
        alert('Failed to start server: ' + error.message);
    }
}

async function stopServer(worktreeName, serverType, port) {
    if (!confirm(`Stop ${serverType} server on port ${port}?`)) {
        return;
    }
    
    try {
        const killRes = await fetch(`/api/kill-port/${port}`, { method: 'POST' });
        const killData = await killRes.json();
        
        if (killData.success) {
            alert(`${serverType} server on port ${port} has been stopped.`);
            
            // Reload worktrees to update port status
            await loadProjectData(window.activeProject);
            renderWorktreesTab();
        } else {
            alert(`Failed to stop ${serverType} server: ${killData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error stopping server:', error);
        alert('Failed to stop server: ' + error.message);
    }
}

async function restartServer(worktreeName, serverType, port) {
    try {
        // First stop the server
        const killRes = await fetch(`/api/kill-port/${port}`, { method: 'POST' });
        const killData = await killRes.json();
        
        if (killData.success) {
            // Wait a moment then start it again
            setTimeout(() => {
                startServer(worktreeName, serverType, port);
            }, 1000);
        } else {
            alert(`Failed to restart ${serverType} server: ${killData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error restarting server:', error);
        alert('Failed to restart server: ' + error.message);
    }
}

// Filter and sort functions
function updateFilter(field, value) {
    filterSettings[field] = value;
    renderIdeasTab();
}

function updateSearchFilter(value) {
    filterSettings.searchQuery = value;
    renderIdeasTab();
}

function updateSort(field, value) {
    if (field === 'field') {
        sortSettings.field = value;
    } else if (field === 'direction') {
        sortSettings.direction = value;
    }
    renderIdeasTab();
}

function toggleSortDirection() {
    sortSettings.direction = sortSettings.direction === 'asc' ? 'desc' : 'asc';
    renderIdeasTab();
}

function clearFilters() {
    filterSettings = {
        status: 'all',
        type: 'all',
        priority: 'all',
        sprint: 'all',
        searchQuery: ''
    };
    renderIdeasTab();
}

// Comment editing functions
function startCommentEdit(itemId, commentIndex) {
    editingItemId = itemId;
    editingCommentIndex = commentIndex;
    renderIdeasTab();
}

function cancelCommentEdit() {
    editingItemId = null;
    editingCommentIndex = null;
    renderIdeasTab();
}

async function saveCommentEdit(itemId, commentIndex) {
    const item = window.ideas.items.find(i => i.id === itemId);
    if (!item || !item.comments || !item.comments[commentIndex]) return;
    
    const newText = document.getElementById(`edit-comment-${itemId}-${commentIndex}`).value.trim();
    if (!newText) {
        alert('Comment cannot be empty');
        return;
    }
    
    item.comments[commentIndex].text = newText;
    item.comments[commentIndex].edited = new Date().toISOString();
    item.updated = new Date().toISOString();
    
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        editingItemId = null;
        editingCommentIndex = null;
        renderIdeasTab();
    } catch (error) {
        alert('Failed to save comment: ' + error.message);
    }
}

async function deleteComment(itemId, commentIndex) {
    if (!confirm('Delete this comment?')) return;
    
    const item = window.ideas.items.find(i => i.id === itemId);
    if (!item || !item.comments) return;
    
    item.comments.splice(commentIndex, 1);
    item.updated = new Date().toISOString();
    
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        renderIdeasTab();
    } catch (error) {
        alert('Failed to delete comment: ' + error.message);
    }
}

// Item closing/reopening functions
async function closeItem(itemId) {
    const item = window.ideas.items.find(i => i.id === itemId);
    if (!item) return;
    
    if (confirm(`Close item "${item.title}"?\n\nThis will mark it as closed but not delete it.`)) {
        item.status = 'closed';
        item.closedAt = new Date().toISOString();
        item.updated = new Date().toISOString();
        
        try {
            await fetch(`/api/projects/${window.activeProject}/ideas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(window.ideas)
            });
            
            renderIdeasTab();
            if (typeof updateOverview === 'function') updateOverview();
        } catch (error) {
            alert('Failed to close item: ' + error.message);
        }
    }
}

async function reopenItem(itemId) {
    const item = window.ideas.items.find(i => i.id === itemId);
    if (!item) return;
    
    item.status = 'new';
    delete item.closedAt;
    item.updated = new Date().toISOString();
    
    try {
        await fetch(`/api/projects/${window.activeProject}/ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.ideas)
        });
        
        renderIdeasTab();
        if (typeof updateOverview === 'function') updateOverview();
    } catch (error) {
        alert('Failed to reopen item: ' + error.message);
    }
}

window.updateFilter = updateFilter;
window.updateSearchFilter = updateSearchFilter;
window.updateSort = updateSort;
window.toggleSortDirection = toggleSortDirection;
window.clearFilters = clearFilters;
window.startCommentEdit = startCommentEdit;
window.cancelCommentEdit = cancelCommentEdit;
window.saveCommentEdit = saveCommentEdit;
window.deleteComment = deleteComment;
window.closeItem = closeItem;
window.reopenItem = reopenItem;
window.toggleSprintItems = toggleSprintItems;
window.archiveWorktree = archiveWorktree;
window.startServer = startServer;
window.stopServer = stopServer;
window.restartServer = restartServer;