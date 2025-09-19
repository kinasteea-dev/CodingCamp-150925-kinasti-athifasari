class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.editingTaskId = null;
        this.initializeApp();
    }

    initializeApp() {
        this.updateDateTime();
        this.setupEventListeners();
        this.setDefaultDate();
        this.renderTasks();
        this.updateStats();
        setInterval(() => this.updateDateTime(), 60000);
    }

    updateDateTime() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }

    setDefaultDate() {
        const today = new Date();
        const dateInput = document.getElementById('taskDate');
        dateInput.value = today.toISOString().split('T')[0];
        dateInput.min = today.toISOString().split('T')[0];
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmission();
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskEdit();
        });

        // Category selection
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Priority selection
        document.querySelectorAll('.priority-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.renderTasks();
            });
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderTasks(e.target.value);
        });

        // Input validation
        ['taskTitle', 'taskDate'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.clearError(id);
            });
        });
    }

    handleTaskSubmission() {
        if (this.validateForm()) {
            const taskData = this.getFormData();
            const newTask = {
                id: Date.now().toString(),
                ...taskData,
                completed: false,
                createdAt: new Date().toISOString()
            };

            this.tasks.push(newTask);
            this.saveTasks();
            this.resetForm();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task created successfully!', 'success');
        }
    }

    handleTaskEdit() {
        if (this.validateEditForm()) {
            const taskData = this.getEditFormData();
            const taskIndex = this.tasks.findIndex(t => t.id === this.editingTaskId);
            
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
                this.saveTasks();
                this.closeEditModal();
                this.renderTasks();
                this.updateStats();
                this.showNotification('Task updated successfully!', 'success');
            }
        }
    }

    validateForm() {
        let isValid = true;
        const title = document.getElementById('taskTitle').value.trim();
        const date = document.getElementById('taskDate').value;
        const category = document.querySelector('.category-btn.active');

        if (!title) {
            this.showError('taskTitle', 'titleError', 'Please enter a task title');
            isValid = false;
        }

        if (!date) {
            this.showError('taskDate', 'dateError', 'Please select a due date');
            isValid = false;
        }

        if (!category) {
            this.showError('category', 'categoryError', 'Please select a category');
            isValid = false;
        }

        return isValid;
    }

    validateEditForm() {
        const title = document.getElementById('editTitle').value.trim();
        const date = document.getElementById('editDate').value;
        return title && date;
    }

    showError(inputId, errorId, message) {
        const input = document.getElementById(inputId);
        const error = document.getElementById(errorId);
        
        if (input) input.classList.add('error');
        if (error) {
            error.textContent = message;
            error.style.display = 'block';
        }
    }

    clearError(inputId) {
        const input = document.getElementById(inputId);
        const errorMap = {
            'taskTitle': 'titleError',
            'taskDate': 'dateError'
        };
        
        if (input) input.classList.remove('error');
        const errorElement = document.getElementById(errorMap[inputId]);
        if (errorElement) errorElement.style.display = 'none';
    }

    getFormData() {
        return {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            dueDate: document.getElementById('taskDate').value,
            dueTime: document.getElementById('taskTime').value,
            category: document.querySelector('.category-btn.active')?.dataset.category || 'other',
            priority: document.querySelector('.priority-btn.active')?.dataset.priority || 'medium'
        };
    }

    getEditFormData() {
        return {
            title: document.getElementById('editTitle').value.trim(),
            description: document.getElementById('editDescription').value.trim(),
            dueDate: document.getElementById('editDate').value,
            dueTime: document.getElementById('editTime').value
        };
    }

    resetForm() {
        document.getElementById('taskForm').reset();
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.priority-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.priority-btn.medium').classList.add('active');
        this.setDefaultDate();
        this.clearAllErrors();
    }

    clearAllErrors() {
        document.querySelectorAll('.form-control').forEach(input => input.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(error => error.style.display = 'none');
    }

    renderTasks(searchTerm = '') {
        const taskList = document.getElementById('taskList');
        let filteredTasks = this.filterTasks(this.currentFilter);

        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                task.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                </div>
            `;
            return;
        }

        const tasksHTML = filteredTasks.map(task => this.createTaskHTML(task)).join('');
        taskList.innerHTML = tasksHTML;
    }

    createTaskHTML(task) {
        const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || '00:00'}`);
        const now = new Date();
        const isOverdue = dueDateTime < now && !task.completed;
        const isToday = task.dueDate === new Date().toISOString().split('T')[0];

        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority" data-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title ${task.completed ? 'completed' : ''}">${this.escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button class="action-btn complete-btn" onclick="taskManager.toggleComplete('${task.id}')">
                            ${task.completed ? 'Undo' : 'Complete'}
                        </button>
                        <button class="action-btn edit-btn" onclick="taskManager.editTask('${task.id}')">Edit</button>
                        <button class="action-btn delete-btn" onclick="taskManager.deleteTask('${task.id}')">Delete</button>
                    </div>
                </div>
                
                <div class="task-meta">
                    <span>📅 ${this.formatDate(task.dueDate)}</span>
                    ${task.dueTime ? `<span>⏰ ${this.formatTime(task.dueTime)}</span>` : ''}
                    <span>📂 ${this.capitalizeFirst(task.category)}</span>
                    <span class="priority-${task.priority}">🎯 ${this.capitalizeFirst(task.priority)} Priority</span>
                    ${isOverdue ? '<span style="color: #E74C3C;">⚠️ Overdue</span>' : ''}
                    ${isToday ? '<span style="color: #F39C12;">📍 Today</span>' : ''}
                </div>
                
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                
                <div class="task-tags">
                    <span class="tag">${this.capitalizeFirst(task.category)}</span>
                    <span class="tag">${this.capitalizeFirst(task.priority)} Priority</span>
                    ${task.completed ? '<span class="tag" style="background: #A8E6CF; color: #2C5530;">✓ Completed</span>' : ''}
                </div>
            </div>
        `;
    }

    filterTasks(filter) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        switch (filter) {
            case 'pending':
                return this.tasks.filter(task => !task.completed);
            case 'completed':
                return this.tasks.filter(task => task.completed);
            case 'today':
                return this.tasks.filter(task => task.dueDate === today);
            case 'overdue':
                return this.tasks.filter(task => {
                    const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
                    return dueDateTime < now && !task.completed;
                });
            case 'high':
                return this.tasks.filter(task => task.priority === 'high');
            default:
                return [...this.tasks].sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed - b.completed;
                    }
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
        }
    }

    toggleComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            
            const message = task.completed ? 'Task completed! 🎉' : 'Task marked as pending';
            this.showNotification(message, task.completed ? 'success' : 'info');
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('Task deleted successfully', 'success');
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.editingTaskId = taskId;
            document.getElementById('editTitle').value = task.title;
            document.getElementById('editDescription').value = task.description || '';
            document.getElementById('editDate').value = task.dueDate;
            document.getElementById('editTime').value = task.dueTime || '';
            
            document.getElementById('editModal').style.display = 'block';
        }
    }

    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editingTaskId = null;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        document.getElementById('totalTasks').textContent = `Total: ${total}`;
        document.getElementById('completedTasks').textContent = `Completed: ${completed}`;
        document.getElementById('pendingTasks').textContent = `Pending: ${pending}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
    }

    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#A8E6CF' : type === 'error' ? '#FFB3BA' : '#81CEEB'};
            color: ${type === 'success' ? '#2C5530' : type === 'error' ? '#8B0000' : '#0056b3'};
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1001;
            font-weight: 500;
            transform: translateX(300px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(300px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    loadTasks() {
        try {
            const saved = JSON.parse(localStorage.getItem('taskflow_tasks') || '[]');
            return saved;
        } catch (error) {
            console.warn('Could not load tasks from localStorage, using empty array');
            return [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('taskflow_tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.warn('Could not save tasks to localStorage');
        }
    }

    // Export tasks to JSON
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `tasks-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    // Import tasks from JSON file
    importTasks(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                if (Array.isArray(importedTasks)) {
                    this.tasks = [...this.tasks, ...importedTasks];
                    this.saveTasks();
                    this.renderTasks();
                    this.updateStats();
                    this.showNotification('Tasks imported successfully!', 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showNotification('Error importing tasks. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Clear all tasks
    clearAllTasks() {
        if (confirm('Are you sure you want to delete all tasks? This action cannot be undone.')) {
            this.tasks = [];
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showNotification('All tasks cleared', 'info');
        }
    }

    // Get productivity insights
    getInsights() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const overdueTasks = this.tasks.filter(task => {
            const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
            return dueDateTime < new Date() && !task.completed;
        }).length;

        const categoryStats = this.tasks.reduce((acc, task) => {
            acc[task.category] = (acc[task.category] || 0) + 1;
            return acc;
        }, {});

        const mostUsedCategory = Object.entries(categoryStats)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None';

        return {
            total,
            completed,
            completionRate,
            overdueTasks,
            mostUsedCategory,
            categoryStats
        };
    }
}

// Initialize the app
const taskManager = new TaskManager();

// Global functions for modal and other interactions
function closeEditModal() {
    taskManager.closeEditModal();
}

// Close modal when clicking outside
document.getElementById('editModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeEditModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modal
    if (e.key === 'Escape') {
        closeEditModal();
    }
    
    // Ctrl/Cmd + Enter to submit form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeForm = document.querySelector('#taskForm:not([style*="display: none"]), #editForm:not([style*="display: none"])');
        if (activeForm) {
            activeForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Add some sample tasks for demo (remove this in production)
if (taskManager.tasks.length === 0) {
    const sampleTasks = [
        {
            id: '1',
            title: 'Complete project proposal',
            description: 'Finish the quarterly project proposal for client presentation',
            dueDate: new Date().toISOString().split('T')[0],
            dueTime: '14:30',
            category: 'work',
            priority: 'high',
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            title: 'Buy groceries',
            description: 'Pick up ingredients for weekend cooking',
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            dueTime: '10:00',
            category: 'personal',
            priority: 'medium',
            completed: false,
            createdAt: new Date().toISOString()
        },
        {
            id: '3',
            title: 'Morning workout',
            description: 'Complete 30-minute cardio session',
            dueDate: new Date().toISOString().split('T')[0],
            dueTime: '07:00',
            category: 'health',
            priority: 'medium',
            completed: true,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
        }
    ];
    
    taskManager.tasks = sampleTasks;
    taskManager.saveTasks();
    taskManager.renderTasks();
    taskManager.updateStats();
}