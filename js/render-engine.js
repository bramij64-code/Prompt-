/**
 * MotionCraft Pro - Main Application Controller
 * Coordinates all modules and handles application lifecycle
 */

class MotionCraftApp {
    constructor() {
        this.appState = {
            isInitialized: false,
            isAuthenticated: false,
            currentUser: null,
            currentProject: null,
            isLoading: false,
            error: null,
            version: '1.0.0'
        };
        
        this.modules = {
            auth: null,
            editor: null,
            ui: null,
            projectManager: null,
            assetManager: null,
            renderEngine: null,
            exportManager: null
        };
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 MotionCraft Pro v' + this.appState.version + ' initializing...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize Firebase
            await this.initFirebase();
            
            // Initialize modules
            await this.initModules();
            
            // Check authentication state
            await this.checkAuthState();
            
            // Initialize UI based on auth state
            await this.initUI();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.appState.isInitialized = true;
            console.log('✅ MotionCraft Pro initialized successfully');
            
            // Handle offline/online status
            this.initNetworkStatus();
            
            // Handle beforeunload
            this.initBeforeUnload();
            
        } catch (error) {
            console.error('❌ Failed to initialize MotionCraft Pro:', error);
            this.handleFatalError(error);
        }
    }
    
    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('active');
            loadingScreen.innerHTML = `
                <div class="loading-content">
                    <div class="loading-logo">
                        <div class="logo-icon">
                            <i class="fas fa-play-circle"></i>
                        </div>
                        <div class="logo-text">
                            <span class="logo-main">MotionCraft</span>
                            <span class="logo-pro">PRO</span>
                        </div>
                    </div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="loading-progress"></div>
                        </div>
                        <div class="loading-message" id="loading-message">Initializing...</div>
                    </div>
                    <div class="loading-tip">
                        <i class="fas fa-lightbulb"></i>
                        <span>Tip: Press Space to play/pause timeline</span>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Update loading progress
     */
    updateLoadingProgress(progress, message) {
        const progressFill = document.getElementById('loading-progress');
        const messageEl = document.getElementById('loading-message');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.remove('active');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 500);
        }
    }
    
    /**
     * Initialize Firebase
     */
    async initFirebase() {
        this.updateLoadingProgress(10, 'Connecting to services...');
        
        try {
            // Check if Firebase config exists
            if (!firebaseConfig) {
                throw new Error('Firebase configuration not found');
            }
            
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            // Initialize services
            this.firebase = {
                auth: firebase.auth(),
                firestore: firebase.firestore(),
                storage: firebase.storage(),
                functions: firebase.functions()
            };
            
            // Configure Firestore persistence
            await this.firebase.firestore.enablePersistence()
                .catch(err => {
                    console.warn('Firestore persistence failed:', err);
                });
            
            console.log('✅ Firebase initialized');
            this.updateLoadingProgress(30, 'Services connected');
            
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw new Error('Failed to initialize cloud services');
        }
    }
    
    /**
     * Initialize all modules
     */
    async initModules() {
        try {
            // Initialize Auth Manager
            this.updateLoadingProgress(35, 'Initializing authentication...');
            this.modules.auth = new AuthManager(this);
            
            // Initialize Project Manager
            this.updateLoadingProgress(40, 'Initializing project system...');
            this.modules.projectManager = new ProjectManager(this);
            
            // Initialize Asset Manager
            this.updateLoadingProgress(45, 'Initializing asset manager...');
            this.modules.assetManager = new AssetManager(this);
            
            // Initialize Render Engine
            this.updateLoadingProgress(50, 'Initializing render engine...');
            this.modules.renderEngine = new RenderEngine(this);
            
            // Initialize Export Manager
            this.updateLoadingProgress(55, 'Initializing export system...');
            this.modules.exportManager = new ExportManager(this);
            
            // Initialize Editor Core (without UI)
            this.updateLoadingProgress(60, 'Initializing editor core...');
            this.modules.editor = new EditorCore(this);
            
            console.log('✅ All modules initialized');
            this.updateLoadingProgress(70, 'Modules ready');
            
        } catch (error) {
            console.error('Module initialization error:', error);
            throw error;
        }
    }
    
    /**
     * Check authentication state
     */
    async checkAuthState() {
        this.updateLoadingProgress(75, 'Checking authentication...');
        
        return new Promise((resolve) => {
            this.firebase.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    // User is signed in
                    this.appState.isAuthenticated = true;
                    this.appState.currentUser = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    };
                    
                    // Load user profile
                    await this.loadUserProfile();
                    
                    console.log('✅ User authenticated:', user.email);
                    this.updateLoadingProgress(80, 'User authenticated');
                    
                } else {
                    // User is signed out
                    this.appState.isAuthenticated = false;
                    this.appState.currentUser = null;
                    console.log('🔒 User not authenticated');
                    this.updateLoadingProgress(80, 'Ready to sign in');
                }
                
                resolve();
            });
        });
    }
    
    /**
     * Load user profile from Firestore
     */
    async loadUserProfile() {
        try {
            const userRef = this.firebase.firestore
                .collection('users')
                .doc(this.appState.currentUser.uid);
            
            const doc = await userRef.get();
            
            if (doc.exists) {
                const userData = doc.data();
                this.appState.currentUser.profile = userData;
                
                // Update last login
                await userRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: new Date().toISOString()
                });
                
                console.log('✅ User profile loaded');
            } else {
                console.log('⚠️ No user profile found');
            }
            
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }
    
    /**
     * Initialize UI based on authentication state
     */
    async initUI() {
        this.updateLoadingProgress(85, 'Initializing interface...');
        
        try {
            // Initialize UI Manager
            this.modules.ui = new UIManager(this.modules.editor);
            
            // Connect modules
            this.connectModules();
            
            // Route to correct page
            await this.routeToPage();
            
            this.updateLoadingProgress(95, 'Finalizing setup...');
            
        } catch (error) {
            console.error('UI initialization error:', error);
            throw error;
        }
    }
    
    /**
     * Connect all modules together
     */
    connectModules() {
        // Connect Editor to Render Engine
        this.modules.editor.setRenderEngine(this.modules.renderEngine);
        
        // Connect Editor to Asset Manager
        this.modules.editor.setAssetManager(this.modules.assetManager);
        
        // Connect Editor to Project Manager
        this.modules.editor.setProjectManager(this.modules.projectManager);
        
        // Connect UI to Editor
        this.modules.ui.setEditor(this.modules.editor);
        
        // Set up event listeners between modules
        this.setupModuleEvents();
    }
    
    /**
     * Set up event communication between modules
     */
    setupModuleEvents() {
        // Project events
        this.modules.projectManager.on('projectLoaded', (project) => {
            this.modules.editor.loadProject(project);
            this.modules.ui.updateProjectInfo(project);
        });
        
        this.modules.projectManager.on('projectSaved', () => {
            this.modules.ui.updateSaveStatus('saved');
        });
        
        this.modules.projectManager.on('saveError', (error) => {
            this.modules.ui.updateSaveStatus('error', error.message);
            this.modules.ui.showNotification('Save failed: ' + error.message, 'error');
        });
        
        // Asset events
        this.modules.assetManager.on('assetUploaded', (asset) => {
            this.modules.ui.updateAssetsPanel(this.modules.assetManager.getAssets());
            this.modules.ui.showNotification('Asset uploaded successfully', 'success');
        });
        
        this.modules.assetManager.on('uploadError', (error) => {
            this.modules.ui.showNotification('Upload failed: ' + error.message, 'error');
        });
        
        // Editor events
        this.modules.editor.on('layerAdded', (layer) => {
            this.modules.ui.updateLayersPanel(this.modules.editor.getLayers());
            this.modules.ui.updateTimelineTracks(this.modules.editor.getLayers());
        });
        
        this.modules.editor.on('layerRemoved', () => {
            this.modules.ui.updateLayersPanel(this.modules.editor.getLayers());
            this.modules.ui.updateTimelineTracks(this.modules.editor.getLayers());
        });
        
        this.modules.editor.on('layerUpdated', (layer) => {
            this.modules.ui.updatePropertiesPanel(layer);
        });
        
        this.modules.editor.on('selectionChanged', (layer) => {
            this.modules.ui.selectLayer(layer?.id);
        });
        
        this.modules.editor.on('projectModified', () => {
            this.modules.ui.updateSaveStatus('unsaved');
        });
        
        this.modules.editor.on('playbackStarted', () => {
            this.modules.ui.isPlaying = true;
            this.modules.ui.updateUIState();
        });
        
        this.modules.editor.on('playbackStopped', () => {
            this.modules.ui.isPlaying = false;
            this.modules.ui.updateUIState();
        });
        
        // Export events
        this.modules.exportManager.on('exportProgress', (progress) => {
            this.modules.ui.updateExportProgress(progress);
        });
        
        this.modules.exportManager.on('exportComplete', (result) => {
            this.modules.ui.showNotification('Export completed successfully', 'success');
            this.modules.ui.showExportResult(result);
        });
        
        this.modules.exportManager.on('exportError', (error) => {
            this.modules.ui.showNotification('Export failed: ' + error.message, 'error');
        });
    }
    
    /**
     * Route to appropriate page based on authentication and URL
     */
    async routeToPage() {
        const path = window.location.pathname;
        const hash = window.location.hash;
        
        // If user is not authenticated and not on auth page, redirect to auth
        if (!this.appState.isAuthenticated && !path.includes('auth.html')) {
            window.location.href = 'auth.html';
            return;
        }
        
        // If user is authenticated and on auth page, redirect to editor
        if (this.appState.isAuthenticated && path.includes('auth.html')) {
            window.location.href = 'editor.html';
            return;
        }
        
        // Handle editor page
        if (path.includes('editor.html')) {
            await this.initEditorPage();
        }
        
        // Handle dashboard page
        if (path.includes('dashboard.html')) {
            await this.initDashboardPage();
        }
        
        // Handle templates page
        if (path.includes('templates.html')) {
            await this.initTemplatesPage();
        }
        
        // Handle hash routes
        if (hash) {
            this.handleHashRoute(hash);
        }
    }
    
    /**
     * Initialize editor page
     */
    async initEditorPage() {
        if (!this.appState.isAuthenticated) {
            window.location.href = 'auth.html';
            return;
        }
        
        try {
            // Check for project ID in URL
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('project');
            const templateId = urlParams.get('template');
            
            if (projectId) {
                // Load existing project
                this.appState.isLoading = true;
                const project = await this.modules.projectManager.loadProject(projectId);
                await this.modules.editor.loadProject(project);
                this.appState.currentProject = project;
                this.appState.isLoading = false;
                
            } else if (templateId) {
                // Create project from template
                this.appState.isLoading = true;
                const project = await this.modules.projectManager.createFromTemplate(templateId);
                await this.modules.editor.loadProject(project);
                this.appState.currentProject = project;
                this.appState.isLoading = false;
                
            } else {
                // Create new project or show project selector
                this.showProjectSelector();
            }
            
            // Initialize asset manager
            await this.modules.assetManager.init();
            
            // Update UI with initial data
            this.modules.ui.updateAssetsPanel(this.modules.assetManager.getAssets());
            
        } catch (error) {
            console.error('Error initializing editor:', error);
            this.modules.ui.showNotification('Failed to load project', 'error');
            this.showProjectSelector();
        }
    }
    
    /**
     * Show project selector modal
     */
    showProjectSelector() {
        this.modules.ui.showModal('projectSelector', {
            title: 'Select Project',
            content: `
                <div class="project-selector">
                    <div class="selector-options">
                        <button class="selector-option" id="new-project-btn">
                            <i class="fas fa-plus-circle"></i>
                            <span>New Project</span>
                            <small>Start from scratch</small>
                        </button>
                        <button class="selector-option" id="open-project-btn">
                            <i class="fas fa-folder-open"></i>
                            <span>Open Project</span>
                            <small>Continue working</small>
                        </button>
                        <button class="selector-option" id="template-project-btn">
                            <i class="fas fa-clone"></i>
                            <span>Use Template</span>
                            <small>Start with a design</small>
                        </button>
                    </div>
                </div>
            `
        });
        
        // Add event listeners
        document.getElementById('new-project-btn')?.addEventListener('click', () => {
            this.createNewProject();
            this.modules.ui.hideModal('projectSelector');
        });
        
        document.getElementById('open-project-btn')?.addEventListener('click', () => {
            this.openProjectBrowser();
            this.modules.ui.hideModal('projectSelector');
        });
        
        document.getElementById('template-project-btn')?.addEventListener('click', () => {
            window.location.href = 'templates.html';
        });
    }
    
    /**
     * Create new project
     */
    async createNewProject() {
        try {
            this.appState.isLoading = true;
            
            const project = await this.modules.projectManager.createProject({
                name: 'Untitled Project',
                settings: {
                    width: 1920,
                    height: 1080,
                    fps: 30,
                    duration: 10,
                    backgroundColor: '#000000'
                }
            });
            
            await this.modules.editor.loadProject(project);
            this.appState.currentProject = project;
            this.appState.isLoading = false;
            
            this.modules.ui.showNotification('New project created', 'success');
            
        } catch (error) {
            console.error('Error creating project:', error);
            this.modules.ui.showNotification('Failed to create project', 'error');
            this.appState.isLoading = false;
        }
    }
    
    /**
     * Open project browser
     */
    async openProjectBrowser() {
        try {
            this.appState.isLoading = true;
            
            const projects = await this.modules.projectManager.getUserProjects();
            
            this.modules.ui.showModal('projectBrowser', {
                title: 'My Projects',
                content: `
                    <div class="project-browser">
                        <div class="browser-header">
                            <input type="text" placeholder="Search projects..." class="project-search">
                            <button class="btn-small" id="refresh-projects-btn">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <div class="projects-grid" id="projects-grid">
                            ${projects.map(project => `
                                <div class="project-card" data-project-id="${project.id}">
                                    <div class="project-thumb">
                                        ${project.thumbnail ? 
                                            `<img src="${project.thumbnail}" alt="${project.name}">` : 
                                            `<div class="project-placeholder">${project.name.charAt(0)}</div>`
                                        }
                                    </div>
                                    <div class="project-info">
                                        <h4>${project.name}</h4>
                                        <p>${new Date(project.modifiedAt).toLocaleDateString()}</p>
                                    </div>
                                    <button class="project-open-btn" title="Open">
                                        <i class="fas fa-arrow-right"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `
            });
            
            // Add event listeners
            document.querySelectorAll('.project-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.project-open-btn')) return;
                    
                    const projectId = card.dataset.projectId;
                    window.location.href = `editor.html?project=${projectId}`;
                });
            });
            
            this.appState.isLoading = false;
            
        } catch (error) {
            console.error('Error loading projects:', error);
            this.modules.ui.showNotification('Failed to load projects', 'error');
            this.appState.isLoading = false;
        }
    }
    
    /**
     * Initialize dashboard page
     */
    async initDashboardPage() {
        if (!this.appState.isAuthenticated) {
            window.location.href = 'auth.html';
            return;
        }
        
        try {
            // Load user projects
            const projects = await this.modules.projectManager.getUserProjects();
            
            // Load user stats
            const stats = await this.modules.projectManager.getUserStats();
            
            // Initialize dashboard UI
            this.initDashboardUI(projects, stats);
            
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }
    
    /**
     * Initialize templates page
     */
    async initTemplatesPage() {
        try {
            // Load community templates
            const templates = await this.modules.projectManager.getTemplates();
            
            // Initialize templates UI
            this.initTemplatesUI(templates);
            
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    }
    
    /**
     * Handle hash routes
     */
    handleHashRoute(hash) {
        const route = hash.replace('#', '');
        
        switch (route) {
            case 'export':
                this.modules.ui.showModal('exportModal');
                break;
                
            case 'settings':
                this.modules.ui.showModal('settingsModal');
                break;
                
            case 'help':
                this.showHelp();
                break;
        }
    }
    
    /**
     * Show help modal
     */
    showHelp() {
        this.modules.ui.showModal('helpModal', {
            title: 'Help & Keyboard Shortcuts',
            content: `
                <div class="help-content">
                    <div class="shortcuts-section">
                        <h4>Timeline Navigation</h4>
                        <ul>
                            <li><kbd>Space</kbd> Play/Pause</li>
                            <li><kbd>←</kbd> <kbd>→</kbd> Seek 1 second</li>
                            <li><kbd>Shift</kbd> + <kbd>←</kbd> <kbd>→</kbd> Seek 5 seconds</li>
                            <li><kbd>Home</kbd> Go to start</li>
                            <li><kbd>End</kbd> Go to end</li>
                        </ul>
                    </div>
                    <div class="shortcuts-section">
                        <h4>Tools</h4>
                        <ul>
                            <li><kbd>V</kbd> Selection Tool</li>
                            <li><kbd>T</kbd> Text Tool</li>
                            <li><kbd>S</kbd> Shape Tool</li>
                            <li><kbd>P</kbd> Pen Tool</li>
                            <li><kbd>M</kbd> Mask Tool</li>
                        </ul>
                    </div>
                    <div class="shortcuts-section">
                        <h4>Editing</h4>
                        <ul>
                            <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> Undo</li>
                            <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> Redo</li>
                            <li><kbd>Ctrl</kbd> + <kbd>S</kbd> Save</li>
                            <li><kbd>Ctrl</kbd> + <kbd>D</kbd> Duplicate</li>
                            <li><kbd>Delete</kbd> Delete selected</li>
                        </ul>
                    </div>
                </div>
            `
        });
    }
    
    /**
     * Initialize network status monitoring
     */
    initNetworkStatus() {
        // Update UI when network status changes
        window.addEventListener('online', () => {
            this.modules.ui.showNotification('Back online', 'success');
            this.appState.isOnline = true;
        });
        
        window.addEventListener('offline', () => {
            this.modules.ui.showNotification('Working offline', 'warning');
            this.appState.isOnline = false;
        });
        
        // Initial status
        this.appState.isOnline = navigator.onLine;
    }
    
    /**
     * Initialize beforeunload handler
     */
    initBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.modules.editor?.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }
    
    /**
     * Handle fatal errors
     */
    handleFatalError(error) {
        console.error('Fatal error:', error);
        
        // Show error screen
        const errorScreen = document.createElement('div');
        errorScreen.className = 'error-screen';
        errorScreen.innerHTML = `
            <div class="error-content">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h2>Something went wrong</h2>
                <p>MotionCraft Pro encountered a fatal error and needs to restart.</p>
                <div class="error-details">
                    <code>${error.message || 'Unknown error'}</code>
                </div>
                <div class="error-actions">
                    <button class="btn btn-primary" id="restart-btn">
                        <i class="fas fa-redo"></i>
                        Restart Application
                    </button>
                    <button class="btn btn-secondary" id="report-btn">
                        <i class="fas fa-bug"></i>
                        Report Issue
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorScreen);
        
        // Add event listeners
        document.getElementById('restart-btn').addEventListener('click', () => {
            window.location.reload();
        });
        
        document.getElementById('report-btn').addEventListener('click', () => {
            const issueUrl = `https://github.com/yourusername/motioncraft/issues/new?title=Fatal%20Error&body=${encodeURIComponent(error.stack || error.message)}`;
            window.open(issueUrl, '_blank');
        });
    }
    
    /**
     * Get application state
     */
    getState() {
        return { ...this.appState };
    }
    
    /**
     * Get a module by name
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }
    
    /**
     * Logout user
     */
    async logout() {
        try {
            await this.modules.auth.logout();
            window.location.href = 'auth.html';
        } catch (error) {
            console.error('Logout error:', error);
            this.modules.ui.showNotification('Logout failed', 'error');
        }
    }
    
    /**
     * Cleanup and destroy application
     */
    destroy() {
        // Destroy all modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        // Remove event listeners
        window.removeEventListener('beforeunload', this.initBeforeUnload);
        window.removeEventListener('online', this.initNetworkStatus);
        window.removeEventListener('offline', this.initNetworkStatus);
        
        console.log('🔴 MotionCraft Pro destroyed');this.appState
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.motioncraft = new MotionCraftApp();
    
    // Make app available globally for debugging
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 MotionCraft Pro debug mode enabled');
        window.app = window.motioncraft;
    }
});

// Handle service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('✅ ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('❌ ServiceWorker registration failed:', error);
            });
    });
}
