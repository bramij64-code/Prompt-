// js/editor-data.js
class ProjectDataManager {
    constructor(userId) {
        this.userId = userId;
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.currentProject = null;
    }
    
    async createProject(projectName = 'Untitled Project') {
        const projectData = {
            name: projectName,
            settings: {
                resolution: '1080p',
                fps: 30,
                duration: 10,
                backgroundColor: '#000000'
            },
            layers: [],
            assets: [],
            timeline: {
                currentTime: 0,
                markers: [],
                duration: 10
            }
        };
        
        try {
            const response = await fetch('http://localhost:5000/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    ...projectData
                })
            });
            
            const result = await response.json();
            this.currentProject = { id: result.projectId, ...projectData };
            return this.currentProject;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }
    
    async loadProject(projectId) {
        try {
            const projectRef = this.db.collection('users')
                .doc(this.userId)
                .collection('projects')
                .doc(projectId);
            
            const doc = await projectRef.get();
            if (doc.exists) {
                this.currentProject = { id: projectId, ...doc.data() };
                return this.currentProject;
            } else {
                throw new Error('Project not found');
            }
        } catch (error) {
            console.error('Error loading project:', error);
            throw error;
        }
    }
    
    async saveProject() {
        if (!this.currentProject) return false;
        
        try {
            const response = await fetch(
                `http://localhost:5000/api/projects/${this.userId}/${this.currentProject.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        layers: this.currentProject.layers,
                        assets: this.currentProject.assets,
                        timeline: this.currentProject.timeline,
                        settings: this.currentProject.settings,
                        name: this.currentProject.name,
                        modifiedAt: new Date().toISOString()
                    })
                }
            );
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error saving project:', error);
            return false;
        }
    }
    
    async uploadAsset(file) {
        if (!this.currentProject) return null;
        
        const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const storageRef = this.storage.ref(`users/${this.userId}/assets/${assetId}`);
        
        try {
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            const assetData = {
                id: assetId,
                name: file.name,
                type: file.type.startsWith('video/') ? 'video' :
                      file.type.startsWith('image/') ? 'image' : 'audio',
                url: downloadURL,
                size: file.size,
                duration: file.type.startsWith('video/') ? await this.getVideoDuration(file) : 0,
                uploadedAt: new Date().toISOString()
            };
            
            // Add to project assets
            this.currentProject.assets.push(assetData);
            await this.saveProject();
            
            return assetData;
        } catch (error) {
            console.error('Error uploading asset:', error);
            throw error;
        }
    }
    
    async getVideoDuration(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            
            video.src = URL.createObjectURL(file);
        });
    }
    
    async getCommunityTemplates(category = null) {
        try {
            const url = category 
                ? `http://localhost:5000/api/templates?category=${category}`
                : 'http://localhost:5000/api/templates';
            
            const response = await fetch(url);
            const result = await response.json();
            return result.templates;
        } catch (error) {
            console.error('Error fetching templates:', error);
            return [];
        }
    }
    
    async loadTemplate(templateId) {
        try {
            const templateRef = this.db.collection('templates').doc(templateId);
            const doc = await templateRef.get();
            
            if (doc.exists) {
                const templateData = doc.data();
                
                // Create new project from template
                const newProject = {
                    name: `Template: ${templateData.name}`,
                    settings: templateData.projectData.settings,
                    layers: templateData.projectData.layers,
                    assets: templateData.projectData.assets,
                    isFromTemplate: true,
                    templateId: templateId
                };
                
                return await this.createProjectFromTemplate(newProject);
            }
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    }
    
    async createProjectFromTemplate(templateData) {
        // Similar to createProject but with template data
        const response = await fetch('http://localhost:5000/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: this.userId,
                ...templateData
            })
        });
        
        const result = await response.json();
        this.currentProject = { id: result.projectId, ...templateData };
        return this.currentProject;
    }
}

// Auto-save functionality
class AutoSaveManager {
    constructor(projectManager) {
        this.projectManager = projectManager;
        this.saveInterval = 30000; // 30 seconds
        this.isSaving = false;
        this.init();
    }
    
    init() {
        setInterval(() => this.autoSave(), this.saveInterval);
        
        // Also save on certain events
        window.addEventListener('beforeunload', () => this.forceSave());
        
        // Listen for project changes
        document.addEventListener('projectChanged', () => {
            if (!this.isSaving) {
                this.debouncedSave();
            }
        });
    }
    
    async autoSave() {
        if (!this.projectManager.currentProject || this.isSaving) return;
        
        this.isSaving = true;
        try {
            await this.projectManager.saveProject();
            console.log('Auto-saved project');
        } catch (error) {
            console.error('Auto-save failed:', error);
        } finally {
            this.isSaving = false;
        }
    }
    
    debouncedSave() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.autoSave(), 2000);
    }
    
    async forceSave() {
        if (this.projectManager.currentProject) {
            await this.projectManager.saveProject();
        }
    }
}
