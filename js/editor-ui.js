/**
 * MotionCraft Pro - Editor UI Manager
 * Handles all UI interactions, state management, and visual updates
 */

class UIManager {
    constructor(editorInstance) {
        this.editor = editorInstance;
        this.currentTool = 'select';
        this.selectedLayer = null;
        this.isPlaying = false;
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        this.currentTime = 0;
        this.zoomLevel = 100;
        this.timelineZoom = 1;
        
        // UI Elements cache
        this.elements = {};
        this.initElements();
        
        // Event handlers
        this.eventHandlers = new Map();
        this.initEventListeners();
        
        // UI State
        this.uiState = {
            showGrid: true,
            showRulers: true,
            snapToGrid: true,
            showAudioWaveform: true,
            highQualityPreview: false,
            darkMode: true
        };
        
        // Initialize UI
        this.initUI();
    }
    
    /**
     * Cache all UI elements
     */
    initElements() {
        // Toolbar elements
        this.elements.toolbar = {
            selectTool: document.getElementById('tool-select'),
            textTool: document.getElementById('tool-text'),
            shapeTool: document.getElementById('tool-shape'),
            penTool: document.getElementById('tool-pen'),
            maskTool: document.getElementById('tool-mask'),
            playBtn: document.getElementById('play-btn'),
            stopBtn: document.getElementById('stop-btn'),
            exportBtn: document.getElementById('export-btn'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn')
        };
        
        // Preview canvas
        this.elements.preview = {
            canvas: document.getElementById('preview-canvas'),
            overlay: document.getElementById('canvas-overlay'),
            zoomIn: document.getElementById('zoom-in'),
            zoomOut: document.getElementById('zoom-out'),
            zoomLevel: document.getElementById('zoom-level'),
            previewQuality: document.getElementById('preview-quality'),
            fitToScreen: document.getElementById('fit-to-screen')
        };
        
        // Timeline elements
        this.elements.timeline = {
            container: document.getElementById('timeline-container'),
            ruler: document.getElementById('timeline-ruler'),
            tracks: document.getElementById('timeline-tracks'),
            scrubber: document.getElementById('timeline-scrubber'),
            currentTime: document.getElementById('current-time'),
            duration: document.getElementById('duration'),
            zoomIn: document.getElementById('zoom-timeline-in'),
            zoomOut: document.getElementById('zoom-timeline-out'),
            addMarkerBtn: document.getElementById('add-marker-btn'),
            playhead: document.getElementById('timeline-playhead')
        };
        
        // Layers panel
        this.elements.layers = {
            panel: document.getElementById('layers-panel'),
            list: document.getElementById('layers-list'),
            addBtn: document.getElementById('add-layer-btn'),
            visibilityToggle: document.getElementById('toggle-layer-visibility'),
            lockToggle: document.getElementById('toggle-layer-lock')
        };
        
        // Properties panel
        this.elements.properties = {
            tabs: document.querySelectorAll('.tab-btn'),
            content: {
                properties: document.getElementById('properties-tab'),
                effects: document.getElementById('effects-tab'),
                export: document.getElementById('export-tab')
            },
            transform: {
                posX: document.getElementById('pos-x'),
                posY: document.getElementById('pos-y'),
                scale: document.getElementById('scale'),
                scaleValue: document.getElementById('scale-value'),
                rotation: document.getElementById('rotation'),
                rotationValue: document.getElementById('rotation-value'),
                opacity: document.getElementById('opacity'),
                opacityValue: document.getElementById('opacity-value')
            },
            keyframes: {
                addBtn: document.getElementById('add-keyframe-btn'),
                clearBtn: document.getElementById('clear-keyframes-btn'),
                list: document.getElementById('keyframe-list')
            },
            effects: {
                library: document.querySelector('.effects-library'),
                applied: document.getElementById('applied-effects')
            },
            export: {
                resolution: document.getElementById('export-resolution'),
                format: document.getElementById('export-format'),
                startBtn: document.getElementById('start-export-btn')
            }
        };
        
        // Assets panel
        this.elements.assets = {
            panel: document.getElementById('assets-panel'),
            grid: document.getElementById('assets-grid'),
            importBtn: document.getElementById('import-asset-btn'),
            search: document.getElementById('asset-search')
        };
        
        // Top navigation
        this.elements.navigation = {
            projectName: document.getElementById('project-name'),
            saveStatus: document.getElementById('save-status'),
            userMenu: document.getElementById('user-menu'),
            fpsSelect: document.getElementById('fps-select')
        };
        
        // Modals
        this.elements.modals = {
            newProject: document.getElementById('new-project-modal'),
            exportModal: document.getElementById('export-modal'),
            settingsModal: document.getElementById('settings-modal'),
            assetLibrary: document.getElementById('asset-library-modal')
        };
        
        // Context menus
        this.elements.contextMenus = {
            timeline: document.getElementById('timeline-context-menu'),
            layer: document.getElementById('layer-context-menu'),
            canvas: document.getElementById('canvas-context-menu')
        };
    }
    
    /**
     * Initialize all event listeners
     */
    initEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.onToolSelect(e));
        });
        
        // Timeline controls
        this.elements.timeline.scrubber.addEventListener('input', (e) => this.onTimelineScrub(e));
        this.elements.timeline.scrubber.addEventListener('change', (e) => this.onTimelineChange(e));
        this.elements.timeline.zoomIn.addEventListener('click', () => this.zoomTimelineIn());
        this.elements.timeline.zoomOut.addEventListener('click', () => this.zoomTimelineOut());
        
        // Playback controls
        this.elements.toolbar.playBtn.addEventListener('click', () => this.togglePlayback());
        this.elements.toolbar.stopBtn.addEventListener('click', () => this.stopPlayback());
        
        // Preview controls
        this.elements.preview.zoomIn.addEventListener('click', () => this.zoomPreviewIn());
        this.elements.preview.zoomOut.addEventListener('click', () => this.zoomPreviewOut());
        this.elements.preview.fitToScreen?.addEventListener('click', () => this.fitPreviewToScreen());
        this.elements.preview.previewQuality.addEventListener('change', (e) => this.onPreviewQualityChange(e));
        
        // Layer management
        this.elements.layers.addBtn.addEventListener('click', () => this.showAddLayerMenu());
        this.elements.layers.visibilityToggle?.addEventListener('click', () => this.toggleLayerVisibility());
        this.elements.layers.lockToggle?.addEventListener('click', () => this.toggleLayerLock());
        
        // Property controls
        Object.values(this.elements.properties.transform).forEach(input => {
            if (input && input.tagName === 'INPUT') {
                input.addEventListener('input', (e) => this.onPropertyChange(e));
                input.addEventListener('change', (e) => this.onPropertyCommit(e));
            }
        });
        
        // Keyframe controls
        this.elements.properties.keyframes.addBtn.addEventListener('click', () => this.addKeyframe());
        this.elements.properties.keyframes.clearBtn.addEventListener('click', () => this.clearKeyframes());
        
        // Tab switching
        this.elements.properties.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e));
        });
        
        // Asset management
        this.elements.assets.importBtn.addEventListener('click', () => this.showAssetImport());
        this.elements.assets.search?.addEventListener('input', (e) => this.searchAssets(e));
        
        // Export controls
        this.elements.properties.export.startBtn.addEventListener('click', () => this.startExport());
        
        // Project management
        this.elements.navigation.projectName.addEventListener('change', (e) => this.renameProject(e));
        this.elements.navigation.fpsSelect.addEventListener('change', (e) => this.changeFPS(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Canvas interactions
        this.elements.preview.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
        this.elements.preview.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
        this.elements.preview.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
        this.elements.preview.canvas.addEventListener('wheel', (e) => this.onCanvasWheel(e));
        
        // Context menus
        document.addEventListener('contextmenu', (e) => this.showContextMenu(e));
        
        // Window events
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * Initialize UI state
     */
    initUI() {
        // Set initial tool as active
        this.setActiveTool('select');
        
        // Initialize timeline ruler
        this.updateTimelineRuler();
        
        // Initialize preview canvas
        this.setupCanvas();
        
        // Update UI state
        this.updateUI();
        
        // Start UI update loop
        this.startUpdateLoop();
    }
    
    /**
     * Set active tool and update UI
     */
    setActiveTool(toolName) {
        // Remove active class from all tools
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected tool
        const toolBtn = document.querySelector(`[data-tool="${toolName}"]`);
        if (toolBtn) {
            toolBtn.classList.add('active');
            this.currentTool = toolName;
            
            // Update cursor based on tool
            this.updateCanvasCursor(toolName);
            
            // Notify editor
            this.editor.onToolChange(toolName);
        }
    }
    
    /**
     * Update canvas cursor based on selected tool
     */
    updateCanvasCursor(tool) {
        const canvas = this.elements.preview.canvas;
        const cursors = {
            'select': 'default',
            'text': 'text',
            'shape': 'crosshair',
            'pen': 'crosshair',
            'mask': 'crosshair',
            'move': 'move',
            'rotate': 'crosshair',
            'scale': 'nwse-resize'
        };
        
        canvas.style.cursor = cursors[tool] || 'default';
    }
    
    /**
     * Update timeline ruler with time markers
     */
    updateTimelineRuler() {
        const ruler = this.elements.timeline.ruler;
        if (!ruler) return;
        
        const duration = this.editor.project?.duration || 10;
        const pixelsPerSecond = 50 * this.timelineZoom;
        const totalWidth = duration * pixelsPerSecond;
        
        ruler.innerHTML = '';
        ruler.style.width = `${totalWidth}px`;
        
        // Calculate major and minor intervals
        const majorInterval = this.calculateTimeInterval(duration);
        const minorInterval = majorInterval / 5;
        
        // Create time markers
        for (let time = 0; time <= duration; time += minorInterval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${time * pixelsPerSecond}px`;
            
            if (Math.abs(time % majorInterval) < 0.001) {
                // Major marker
                marker.classList.add('major');
                const timeLabel = document.createElement('span');
                timeLabel.className = 'time-label';
                timeLabel.textContent = this.formatTime(time);
                marker.appendChild(timeLabel);
            } else {
                // Minor marker
                marker.classList.add('minor');
            }
            
            ruler.appendChild(marker);
        }
    }
    
    /**
     * Calculate appropriate time interval for timeline ruler
     */
    calculateTimeInterval(duration) {
        if (duration <= 5) return 1;
        if (duration <= 15) return 2;
        if (duration <= 30) return 5;
        if (duration <= 60) return 10;
        return 15;
    }
    
    /**
     * Format time as MM:SS or HH:MM:SS
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Update timeline tracks with layers
     */
    updateTimelineTracks(layers) {
        const tracksContainer = this.elements.timeline.tracks;
        if (!tracksContainer) return;
        
        tracksContainer.innerHTML = '';
        
        layers.forEach((layer, index) => {
            const track = this.createTimelineTrack(layer, index);
            tracksContainer.appendChild(track);
        });
        
        // Update playhead position
        this.updatePlayhead();
    }
    
    /**
     * Create a timeline track for a layer
     */
    createTimelineTrack(layer, index) {
        const track = document.createElement('div');
        track.className = 'timeline-track';
        track.dataset.layerId = layer.id;
        
        // Track header
        const header = document.createElement('div');
        header.className = 'track-header';
        header.innerHTML = `
            <span class="track-icon">${this.getLayerIcon(layer.type)}</span>
            <span class="track-name">${layer.name || `Layer ${index + 1}`}</span>
            <button class="track-toggle" data-action="toggle">👁️</button>
            <button class="track-lock" data-action="lock">🔒</button>
        `;
        
        // Track body
        const body = document.createElement('div');
        body.className = 'track-body';
        
        // Layer clip
        const clip = document.createElement('div');
        clip.className = 'layer-clip';
        clip.style.left = `${layer.startTime * 50}px`;
        clip.style.width = `${layer.duration * 50}px`;
        clip.style.backgroundColor = this.getLayerColor(layer.type);
        
        // Keyframe markers
        if (layer.keyframes && layer.keyframes.length > 0) {
            layer.keyframes.forEach(keyframe => {
                const marker = document.createElement('div');
                marker.className = 'keyframe-marker';
                marker.style.left = `${keyframe.time * 50}px`;
                marker.title = `Keyframe at ${this.formatTime(keyframe.time)}`;
                clip.appendChild(marker);
            });
        }
        
        body.appendChild(clip);
        
        // Event listeners for clip
        clip.addEventListener('mousedown', (e) => this.onClipMouseDown(e, layer));
        clip.addEventListener('dblclick', () => this.selectLayer(layer.id));
        
        track.appendChild(header);
        track.appendChild(body);
        
        // Header button events
        header.querySelector('[data-action="toggle"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(layer.id);
        });
        
        header.querySelector('[data-action="lock"]').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerLock(layer.id);
        });
        
        return track;
    }
    
    /**
     * Get icon for layer type
     */
    getLayerIcon(type) {
        const icons = {
            'video': '🎬',
            'image': '🖼️',
            'text': '🔤',
            'shape': '⬢',
            'audio': '🎵',
            'adjustment': '🎨'
        };
        return icons[type] || '📄';
    }
    
    /**
     * Get color for layer type
     */
    getLayerColor(type) {
        const colors = {
            'video': 'rgba(102, 126, 234, 0.6)',
            'image': 'rgba(76, 175, 80, 0.6)',
            'text': 'rgba(255, 193, 7, 0.6)',
            'shape': 'rgba(233, 30, 99, 0.6)',
            'audio': 'rgba(156, 39, 176, 0.6)',
            'adjustment': 'rgba(0, 188, 212, 0.6)'
        };
        return colors[type] || 'rgba(158, 158, 158, 0.6)';
    }
    
    /**
     * Update layers panel
     */
    updateLayersPanel(layers) {
        const layersList = this.elements.layers.list;
        if (!layersList) return;
        
        layersList.innerHTML = '';
        
        // Reverse to show top layer first
        [...layers].reverse().forEach((layer, index) => {
            const layerItem = this.createLayerListItem(layer, layers.length - index - 1);
            layersList.appendChild(layerItem);
        });
    }
    
    /**
     * Create layer list item
     */
    createLayerListItem(layer, index) {
        const item = document.createElement('div');
        item.className = 'layer-item';
        if (this.selectedLayer?.id === layer.id) {
            item.classList.add('active');
        }
        item.dataset.layerId = layer.id;
        
        item.innerHTML = `
            <div class="layer-drag-handle">⋮⋮</div>
            <div class="layer-icon">${this.getLayerIcon(layer.type)}</div>
            <div class="layer-info">
                <div class="layer-name">${layer.name || `Layer ${index + 1}`}</div>
                <div class="layer-type">${layer.type}</div>
            </div>
            <div class="layer-controls">
                <button class="layer-toggle" title="Toggle visibility">
                    ${layer.visible ? '👁️' : '👁️‍🗨️'}
                </button>
                <button class="layer-lock" title="Lock/Unlock">
                    ${layer.locked ? '🔒' : '🔓'}
                </button>
            </div>
        `;
        
        // Event listeners
        item.addEventListener('click', () => this.selectLayer(layer.id));
        item.querySelector('.layer-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerVisibility(layer.id);
        });
        item.querySelector('.layer-lock').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLayerLock(layer.id);
        });
        
        // Make draggable
        this.makeLayerDraggable(item, layer);
        
        return item;
    }
    
    /**
     * Make layer item draggable for reordering
     */
    makeLayerDraggable(item, layer) {
        const handle = item.querySelector('.layer-drag-handle');
        
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startLayerDrag(item, layer);
        });
    }
    
    /**
     * Update properties panel for selected layer
     */
    updatePropertiesPanel(layer) {
        if (!layer) {
            this.clearPropertiesPanel();
            return;
        }
        
        // Update transform properties
        this.elements.properties.transform.posX.value = layer.x || 0;
        this.elements.properties.transform.posY.value = layer.y || 0;
        this.elements.properties.transform.scale.value = (layer.scale || 1) * 100;
        this.elements.properties.transform.scaleValue.textContent = `${Math.round((layer.scale || 1) * 100)}%`;
        this.elements.properties.transform.rotation.value = layer.rotation || 0;
        this.elements.properties.transform.rotationValue.textContent = `${layer.rotation || 0}°`;
        this.elements.properties.transform.opacity.value = (layer.opacity || 1) * 100;
        this.elements.properties.transform.opacityValue.textContent = `${Math.round((layer.opacity || 1) * 100)}%`;
        
        // Update keyframes list
        this.updateKeyframesList(layer.keyframes || []);
        
        // Enable/disable controls based on layer type
        this.updatePropertyControls(layer.type);
    }
    
    /**
     * Clear properties panel
     */
    clearPropertiesPanel() {
        Object.values(this.elements.properties.transform).forEach(input => {
            if (input && input.tagName === 'INPUT') {
                input.value = 0;
            }
        });
        
        this.elements.properties.transform.scaleValue.textContent = '100%';
        this.elements.properties.transform.rotationValue.textContent = '0°';
        this.elements.properties.transform.opacityValue.textContent = '100%';
        
        this.elements.properties.keyframes.list.innerHTML = '<div class="empty-state">No keyframes</div>';
    }
    
    /**
     * Update property controls based on layer type
     */
    updatePropertyControls(layerType) {
        // Enable/disable specific controls
        const controls = this.elements.properties.transform;
        
        switch (layerType) {
            case 'audio':
                controls.scale.disabled = true;
                controls.rotation.disabled = true;
                break;
            case 'adjustment':
                controls.posX.disabled = true;
                controls.posY.disabled = true;
                controls.scale.disabled = true;
                controls.rotation.disabled = true;
                break;
            default:
                Object.values(controls).forEach(control => {
                    if (control && control.disabled) control.disabled = false;
                });
        }
    }
    
    /**
     * Update keyframes list
     */
    updateKeyframesList(keyframes) {
        const list = this.elements.properties.keyframes.list;
        list.innerHTML = '';
        
        if (keyframes.length === 0) {
            list.innerHTML = '<div class="empty-state">No keyframes</div>';
            return;
        }
        
        keyframes.sort((a, b) => a.time - b.time).forEach(keyframe => {
            const item = document.createElement('div');
            item.className = 'keyframe-item';
            item.dataset.time = keyframe.time;
            
            item.innerHTML = `
                <div class="keyframe-time">${this.formatTime(keyframe.time)}</div>
                <div class="keyframe-properties">
                    ${Object.entries(keyframe.properties).map(([prop, value]) => 
                        `<span class="keyframe-prop">${prop}: ${value}</span>`
                    ).join('')}
                </div>
                <button class="keyframe-remove" title="Remove keyframe">×</button>
            `;
            
            item.querySelector('.keyframe-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeKeyframe(keyframe.time);
            });
            
            item.addEventListener('click', () => {
                this.seekToTime(keyframe.time);
            });
            
            list.appendChild(item);
        });
    }
    
    /**
     * Update assets panel
     */
    updateAssetsPanel(assets) {
        const assetsGrid = this.elements.assets.grid;
        if (!assetsGrid) return;
        
        assetsGrid.innerHTML = '';
        
        assets.forEach(asset => {
            const assetItem = this.createAssetItem(asset);
            assetsGrid.appendChild(assetItem);
        });
    }
    
    /**
     * Create asset grid item
     */
    createAssetItem(asset) {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.dataset.assetId = asset.id;
        item.title = asset.name;
        
        let previewHTML = '';
        if (asset.type === 'image') {
            previewHTML = `<img src="${asset.url}" alt="${asset.name}" loading="lazy">`;
        } else if (asset.type === 'video') {
            previewHTML = `
                <video preload="metadata">
                    <source src="${asset.url}" type="video/mp4">
                </video>
                <div class="video-duration">${this.formatTime(asset.duration)}</div>
            `;
        } else if (asset.type === 'audio') {
            previewHTML = `<div class="audio-preview">🎵</div>`;
        } else {
            previewHTML = `<div class="file-preview">📄</div>`;
        }
        
        item.innerHTML = `
            <div class="asset-preview">${previewHTML}</div>
            <div class="asset-info">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-size">${this.formatFileSize(asset.size)}</div>
            </div>
            <button class="asset-use-btn" title="Add to project">+</button>
        `;
        
        // Event listeners
        item.querySelector('.asset-use-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.useAsset(asset);
        });
        
        item.addEventListener('click', () => {
            this.previewAsset(asset);
        });
        
        item.addEventListener('dblclick', () => {
            this.useAsset(asset);
        });
        
        return item;
    }
    
    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Update playhead position
     */
    updatePlayhead() {
        const playhead = this.elements.timeline.playhead;
        const scrubber = this.elements.timeline.scrubber;
        const currentTime = this.elements.timeline.currentTime;
        
        if (!playhead || !scrubber || !currentTime) return;
        
        const duration = this.editor.project?.duration || 10;
        const position = (this.currentTime / duration) * 100;
        
        playhead.style.left = `${position}%`;
        scrubber.value = position;
        currentTime.textContent = this.formatTime(this.currentTime);
    }
    
    /**
     * Update save status
     */
    updateSaveStatus(status, message = '') {
        const saveStatus = this.elements.navigation.saveStatus;
        if (!saveStatus) return;
        
        saveStatus.textContent = message || status;
        saveStatus.className = `auto-save-status ${status}`;
        
        if (status === 'saving') {
            saveStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        } else if (status === 'saved') {
            saveStatus.innerHTML = '<i class="fas fa-check"></i> Saved';
            setTimeout(() => {
                saveStatus.textContent = 'Saved';
                saveStatus.className = 'auto-save-status';
            }, 2000);
        } else if (status === 'error') {
            saveStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        }
    }
    
    /**
     * Update project info
     */
    updateProjectInfo(project) {
        if (!project) return;
        
        // Update project name
        this.elements.navigation.projectName.value = project.name || 'Untitled Project';
        
        // Update duration
        this.elements.timeline.duration.textContent = this.formatTime(project.duration || 10);
        
        // Update timeline
        this.updateTimelineRuler();
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto-remove
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.remove('show');
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    }
    
    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    /**
     * Show modal
     */
    showModal(modalId, options = {}) {
        const modal = this.elements.modals[modalId];
        if (!modal) return;
        
        // Set modal content if provided
        if (options.content) {
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) modalBody.innerHTML = options.content;
        }
        
        // Set title if provided
        if (options.title) {
            const modalTitle = modal.querySelector('.modal-title');
            if (modalTitle) modalTitle.textContent = options.title;
        }
        
        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        
        // Add close event
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            const closeHandler = () => this.hideModal(modalId);
            closeBtn.addEventListener('click', closeHandler);
            this.eventHandlers.set(`${modalId}-close`, closeHandler);
        }
        
        // Add overlay click to close
        const overlayHandler = (e) => {
            if (e.target === modal) this.hideModal(modalId);
        };
        modal.addEventListener('click', overlayHandler);
        this.eventHandlers.set(`${modalId}-overlay`, overlayHandler);
    }
    
    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = this.elements.modals[modalId];
        if (!modal) return;
        
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
        
        // Remove event handlers
        const closeHandler = this.eventHandlers.get(`${modalId}-close`);
        const overlayHandler = this.eventHandlers.get(`${modalId}-overlay`);
        
        if (closeHandler) {
            modal.querySelector('.modal-close')?.removeEventListener('click', closeHandler);
        }
        if (overlayHandler) {
            modal.removeEventListener('click', overlayHandler);
        }
    }
    
    /**
     * Show context menu
     */
    showContextMenu(e) {
        e.preventDefault();
        
        // Determine context
        const target = e.target;
        let context = 'canvas';
        
        if (target.closest('.timeline-track')) {
            context = 'timeline';
        } else if (target.closest('.layer-item')) {
            context = 'layer';
        }
        
        // Get context menu
        const menu = this.elements.contextMenus[context];
        if (!menu) return;
        
        // Position menu
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.add('active');
        
        // Hide other context menus
        Object.values(this.elements.contextMenus).forEach(m => {
            if (m !== menu) m.classList.remove('active');
        });
        
        // Add click outside to close
        const closeHandler = () => {
            menu.classList.remove('active');
            document.removeEventListener('click', closeHandler);
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 10);
    }
    
    /**
     * Setup canvas for interactions
     */
    setupCanvas() {
        const canvas = this.elements.preview.canvas;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        this.resizeCanvas();
        
        // Draw initial grid
        this.drawGrid(ctx);
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const canvas = this.elements.preview.canvas;
        const container = canvas.parentElement;
        
        if (!container) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
    }
    
    /**
     * Draw grid on canvas
     */
    drawGrid(ctx) {
        if (!this.uiState.showGrid) return;
        
        const canvas = this.elements.preview.canvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        const gridSize = 20;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    /**
     * Start UI update loop
     */
    startUpdateLoop() {
        const update = () => {
            this.updateUI();
            this.animationFrame = requestAnimationFrame(update);
        };
        update();
    }
    
    /**
     * Main UI update function
     */
    updateUI() {
        // Update playhead
        this.updatePlayhead();
        
        // Update canvas if needed
        if (this.editor.shouldRedraw) {
            this.redrawCanvas();
            this.editor.shouldRedraw = false;
        }
        
        // Update UI elements based on state
        this.updateUIState();
    }
    
    /**
     * Redraw canvas with current composition
     */
    redrawCanvas() {
        const canvas = this.elements.preview.canvas;
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        this.drawGrid(ctx);
        
        // Draw layers (in reverse order for correct stacking)
        const layers = this.editor.getVisibleLayersAtTime(this.currentTime);
        layers.reverse().forEach(layer => {
            this.drawLayer(ctx, layer, this.currentTime);
        });
        
        // Draw selection if active
        if (this.selectedLayer && this.currentTool === 'select') {
            this.drawSelection(ctx, this.selectedLayer);
        }
        
        // Draw rulers if enabled
        if (this.uiState.showRulers) {
            this.drawRulers(ctx);
        }
    }
    
    /**
     * Draw a layer on canvas
     */
    drawLayer(ctx, layer, time) {
        if (!layer.visible) return;
        
        // Calculate interpolated properties
        const properties = this.editor.getLayerPropertiesAtTime(layer, time);
        
        // Save context
        ctx.save();
        
        // Apply transformations
        ctx.translate(properties.x, properties.y);
        ctx.rotate((properties.rotation || 0) * Math.PI / 180);
        ctx.scale(properties.scale, properties.scale);
        ctx.globalAlpha = properties.opacity || 1;
        
        // Draw based on layer type
        switch (layer.type) {
            case 'image':
                this.drawImageLayer(ctx, layer, properties);
                break;
            case 'text':
                this.drawTextLayer(ctx, layer, properties);
                break;
            case 'shape':
                this.drawShapeLayer(ctx, layer, properties);
                break;
            case 'video':
                this.drawVideoLayer(ctx, layer, properties, time);
                break;
        }
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Draw selection handles around layer
     */
    drawSelection(ctx, layer) {
        const properties = this.editor.getLayerPropertiesAtTime(layer, this.currentTime);
        
        ctx.save();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw bounding box
        const width = layer.width || 100;
        const height = layer.height || 100;
        
        ctx.translate(properties.x, properties.y);
        ctx.rotate((properties.rotation || 0) * Math.PI / 180);
        ctx.scale(properties.scale, properties.scale);
        
        ctx.strokeRect(-width / 2, -height / 2, width, height);
        
        // Draw resize handles
        const handleSize = 8;
        const handles = [
            [-width/2, -height/2], // top-left
            [width/2, -height/2],  // top-right
            [width/2, height/2],   // bottom-right
            [-width/2, height/2]   // bottom-left
        ];
        
        handles.forEach(([x, y]) => {
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        });
        
        // Draw rotation handle
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(0, -height/2 - 20, 6, 20);
        
        ctx.restore();
    }
    
    /**
     * Draw rulers
     */
    drawRulers(ctx) {
        const canvas = this.elements.preview.canvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 20, height); // Left ruler
        ctx.fillRect(0, 0, width, 20);  // Top ruler
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px monospace';
        
        // Draw horizontal ruler markings
        for (let x = 20; x < width; x += 50) {
            ctx.fillText(x.toString(), x + 2, 18);
            ctx.beginPath();
            ctx.moveTo(x, 20);
            ctx.lineTo(x, 15);
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }
        
        // Draw vertical ruler markings
        for (let y = 20; y < height; y += 50) {
            ctx.fillText(y.toString(), 2, y + 10);
            ctx.beginPath();
            ctx.moveTo(20, y);
            ctx.lineTo(15, y);
            ctx.strokeStyle = 'white';
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Update UI state based on editor state
     */
    updateUIState() {
        // Update play/pause button
        if (this.isPlaying) {
            this.elements.toolbar.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            this.elements.toolbar.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
        
        // Update zoom level display
        this.elements.preview.zoomLevel.textContent = `${this.zoomLevel}%`;
        
        // Update timeline zoom controls
        this.elements.timeline.zoomIn.disabled = this.timelineZoom >= 4;
        this.elements.timeline.zoomOut.disabled = this.timelineZoom <= 0.25;
        
        // Update property controls based on selected layer
        if (this.selectedLayer) {
            this.elements.properties.keyframes.addBtn.disabled = false;
            this.elements.properties.keyframes.clearBtn.disabled = !this.selectedLayer.keyframes?.length;
        } else {
            this.elements.properties.keyframes.addBtn.disabled = true;
            this.elements.properties.keyframes.clearBtn.disabled = true;
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Don't trigger if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;
        
        // Spacebar - Play/Pause
        if (key === ' ' && !e.target.tagName === 'INPUT') {
            e.preventDefault();
            this.togglePlayback();
        }
        
        // Timeline navigation
        if (key === 'arrowright') {
            e.preventDefault();
            this.seekRelative(shift ? 5 : 1);
        } else if (key === 'arrowleft') {
            e.preventDefault();
            this.seekRelative(shift ? -5 : -1);
        }
        
        // Tool shortcuts
        if (!ctrl && !shift) {
            switch (key) {
                case 'v': this.setActiveTool('select'); break;
                case 't': this.setActiveTool('text'); break;
                case 's': this.setActiveTool('shape'); break;
                case 'p': this.setActiveTool('pen'); break;
                case 'm': this.setActiveTool('mask'); break;
            }
        }
        
        // Editing shortcuts
        if (ctrl) {
            switch (key) {
                case 'z': e.preventDefault(); this.editor.undo(); break;
                case 'y': e.preventDefault(); this.editor.redo(); break;
                case 's': e.preventDefault(); this.editor.saveProject(); break;
                case 'd': e.preventDefault(); this.duplicateSelectedLayer(); break;
                case 'c': e.preventDefault(); this.copySelectedLayer(); break;
                case 'v': e.preventDefault(); this.pasteLayer(); break;
                case 'delete': 
                case 'backspace': 
                    e.preventDefault(); 
                    this.deleteSelectedLayer(); 
                    break;
            }
        }
        
        // Layer visibility/lock
        if (shift) {
            switch (key) {
                case 'h': e.preventDefault(); this.toggleLayerVisibility(this.selectedLayer?.id); break;
                case 'l': e.preventDefault(); this.toggleLayerLock(this.selectedLayer?.id); break;
            }
        }
    }
    
    // ======================
    // EVENT HANDLER METHODS
    // ======================
    
    onToolSelect(e) {
        const tool = e.currentTarget.dataset.tool;
        if (tool) {
            this.setActiveTool(tool);
        }
    }
    
    onTimelineScrub(e) {
        const value = parseInt(e.target.value);
        const duration = this.editor.project?.duration || 10;
        this.currentTime = (value / 100) * duration;
        this.updatePlayhead();
        this.editor.seekToTime(this.currentTime);
    }
    
    onTimelineChange(e) {
        const value = parseInt(e.target.value);
        const duration = this.editor.project?.duration || 10;
        this.currentTime = (value / 100) * duration;
        this.editor.seekToTime(this.currentTime);
    }
    
    onCanvasMouseDown(e) {
        const rect = this.elements.preview.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to canvas coordinates
        const scale = this.zoomLevel / 100;
        const canvasX = x / scale;
        const canvasY = y / scale;
        
        switch (this.currentTool) {
            case 'select':
                const clickedLayer = this.findLayerAtPoint(canvasX, canvasY);
                if (clickedLayer) {
                    this.selectLayer(clickedLayer.id);
                    this.startDragging(canvasX, canvasY);
                }
                break;
            case 'text':
                this.addTextLayer(canvasX, canvasY);
                break;
            case 'shape':
                this.startDrawingShape(canvasX, canvasY);
                break;
            case 'pen':
                this.startDrawingPath(canvasX, canvasY);
                break;
        }
        
        this.isDragging = true;
    }
    
    onCanvasMouseMove(e) {
        if (!this.isDragging) return;
        
        const rect = this.elements.preview.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const scale = this.zoomLevel / 100;
        const canvasX = x / scale;
        const canvasY = y / scale;
        
        if (this.isResizing) {
            this.resizeSelectedLayer(canvasX, canvasY);
        } else if (this.isRotating) {
            this.rotateSelectedLayer(canvasX, canvasY);
        } else if (this.selectedLayer && this.currentTool === 'select') {
            this.dragSelectedLayer(canvasX, canvasY);
        }
    }
    
    onCanvasMouseUp(e) {
        this.isDragging = false;
        this.isResizing = false;
        this.isRotating = false;
        
        if (this.selectedLayer) {
            this.editor.updateLayer(this.selectedLayer);
        }
    }
    
    onCanvasWheel(e) {
        e.preventDefault();
        
        if (e.ctrlKey) {
            // Zoom canvas
            const delta = e.deltaY > 0 ? -10 : 10;
            this.zoomPreview(delta);
        } else {
            // Scroll timeline
            this.seekRelative(e.deltaY > 0 ? 1 : -1);
        }
    }
    
    onPropertyChange(e) {
        if (!this.selectedLayer) return;
        
        const property = e.target.id;
        const value = parseFloat(e.target.value);
        
        switch (property) {
            case 'pos-x':
                this.selectedLayer.x = value;
                break;
            case 'pos-y':
                this.selectedLayer.y = value;
                break;
            case 'scale':
                this.selectedLayer.scale = value / 100;
                this.elements.properties.transform.scaleValue.textContent = `${value}%`;
                break;
            case 'rotation':
                this.selectedLayer.rotation = value;
                this.elements.properties.transform.rotationValue.textContent = `${value}°`;
                break;
            case 'opacity':
                this.selectedLayer.opacity = value / 100;
                this.elements.properties.transform.opacityValue.textContent = `${value}%`;
                break;
        }
        
        this.editor.shouldRedraw = true;
    }
    
    onPropertyCommit(e) {
        if (this.selectedLayer) {
            this.editor.updateLayer(this.selectedLayer);
        }
    }
    
    onWindowResize() {
        this.resizeCanvas();
        this.editor.shouldRedraw = true;
    }
    
    // ======================
    // ACTION METHODS
    // ======================
    
    selectLayer(layerId) {
        const layer = this.editor.getLayer(layerId);
        if (layer) {
            this.selectedLayer = layer;
            this.updatePropertiesPanel(layer);
            this.updateLayerSelectionUI();
            this.editor.shouldRedraw = true;
        }
    }
    
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.startPlayback();
        } else {
            this.stopPlayback();
        }
        
        this.updateUIState();
    }
    
    startPlayback() {
        const fps = parseInt(this.elements.navigation.fpsSelect.value) || 30;
        const frameDuration = 1000 / fps;
        
        const play = () => {
            if (!this.isPlaying) return;
            
            const duration = this.editor.project?.duration || 10;
            this.currentTime += 1 / fps;
            
            if (this.currentTime >= duration) {
                this.currentTime = 0;
            }
            
            this.updatePlayhead();
            this.editor.seekToTime(this.currentTime);
            
            setTimeout(play, frameDuration);
        };
        
        play();
    }
    
    stopPlayback() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.updatePlayhead();
        this.editor.seekToTime(0);
    }
    
    seekToTime(time) {
        this.currentTime = Math.max(0, Math.min(time, this.editor.project?.duration || 10));
        this.updatePlayhead();
        this.editor.seekToTime(this.currentTime);
    }
    
    seekRelative(seconds) {
        this.seekToTime(this.currentTime + seconds);
    }
    
    zoomPreviewIn() {
        this.zoomPreview(10);
    }
    
    zoomPreviewOut() {
        this.zoomPreview(-10);
    }
    
    zoomPreview(delta) {
        this.zoomLevel = Math.max(10, Math.min(500, this.zoomLevel + delta));
        this.elements.preview.zoomLevel.textContent = `${this.zoomLevel}%`;
        
        const canvas = this.elements.preview.canvas;
        canvas.style.transform = `scale(${this.zoomLevel / 100})`;
        
        this.editor.shouldRedraw = true;
    }
    
    fitPreviewToScreen() {
        const canvas = this.elements.preview.canvas;
        const container = canvas.parentElement;
        
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const projectWidth = this.editor.project?.settings?.width || 1920;
        const projectHeight = this.editor.project?.settings?.height || 1080;
        
        const scaleX = rect.width / projectWidth;
        const scaleY = rect.height / projectHeight;
        const scale = Math.min(scaleX, scaleY) * 100;
        
        this.zoomLevel = Math.floor(scale);
        this.elements.preview.zoomLevel.textContent = `${this.zoomLevel}%`;
        canvas.style.transform = `scale(${this.zoomLevel / 100})`;
    }
    
    zoomTimelineIn() {
        this.timelineZoom = Math.min(4, this.timelineZoom * 1.5);
        this.updateTimelineRuler();
        this.updateTimelineTracks(this.editor.project?.layers || []);
    }
    
    zoomTimelineOut() {
        this.timelineZoom = Math.max(0.25, this.timelineZoom / 1.5);
        this.updateTimelineRuler();
        this.updateTimelineTracks(this.editor.project?.layers || []);
    }
    
    addKeyframe() {
        if (!this.selectedLayer) return;
        
        const keyframe = {
            time: this.currentTime,
            properties: {
                x: this.selectedLayer.x || 0,
                y: this.selectedLayer.y || 0,
                scale: this.selectedLayer.scale || 1,
                rotation: this.selectedLayer.rotation || 0,
                opacity: this.selectedLayer.opacity || 1
            }
        };
        
        this.editor.addKeyframe(this.selectedLayer.id, keyframe);
        this.updateKeyframesList(this.selectedLayer.keyframes || []);
        this.showNotification('Keyframe added', 'success');
    }
    
    removeKeyframe(time) {
        if (!this.selectedLayer) return;
        
        this.editor.removeKeyframe(this.selectedLayer.id, time);
        this.updateKeyframesList(this.selectedLayer.keyframes || []);
        this.showNotification('Keyframe removed', 'info');
    }
    
    clearKeyframes() {
        if (!this.selectedLayer) return;
        
        if (confirm('Clear all keyframes for this layer?')) {
            this.editor.clearKeyframes(this.selectedLayer.id);
            this.updateKeyframesList([]);
            this.showNotification('All keyframes cleared', 'info');
        }
    }
    
    switchTab(e) {
        const tabName = e.currentTarget.dataset.tab;
        
        // Update active tab
        this.elements.properties.tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // Show corresponding content
        Object.entries(this.elements.properties.content).forEach(([name, element]) => {
            if (name === tabName) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    }
    
    renameProject(e) {
        const newName = e.target.value.trim();
        if (newName && this.editor.project) {
            this.editor.project.name = newName;
            this.editor.saveProject();
            this.showNotification('Project renamed', 'success');
        }
    }
    
    changeFPS(e) {
        const fps = parseInt(e.target.value);
        if (fps && this.editor.project) {
            this.editor.project.settings.fps = fps;
            this.editor.saveProject();
            this.showNotification(`FPS changed to ${fps}`, 'info');
        }
    }
    
    startExport() {
        const resolution = this.elements.properties.export.resolution.value;
        const format = this.elements.properties.export.format.value;
        
        this.showModal('exportModal', {
            title: 'Export Video',
            content: `
                <div class="export-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">Preparing export...</div>
                </div>
                <div class="export-options">
                    <div class="option">
                        <label>Resolution:</label>
                        <span>${resolution}</span>
                    </div>
                    <div class="option">
                        <label>Format:</label>
                        <span>${format}</span>
                    </div>
                    <div class="option">
                        <label>Estimated Size:</label>
                        <span>Calculating...</span>
                    </div>
                </div>
            `
        });
        
        // Start export process
        this.editor.exportVideo({ resolution, format });
    }
    
    // ======================
    // HELPER METHODS
    // ======================
    
    findLayerAtPoint(x, y) {
        const layers = this.editor.project?.layers || [];
        
        // Check layers in reverse order (top to bottom)
        for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            if (!layer.visible || layer.locked) continue;
            
            const props = this.editor.getLayerPropertiesAtTime(layer, this.currentTime);
            const width = layer.width || 100;
            const height = layer.height || 100;
            const scale = props.scale || 1;
            
            // Transform point to layer's local space
            const dx = x - props.x;
            const dy = y - props.y;
            const angle = (props.rotation || 0) * Math.PI / 180;
            
            // Rotate point back
            const cos = Math.cos(-angle);
            const sin = Math.sin(-angle);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            
            // Check if point is within layer bounds
            const halfWidth = (width * scale) / 2;
            const halfHeight = (height * scale) / 2;
            
            if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
                return layer;
            }
        }
        
        return null;
    }
    
    startDragging(startX, startY) {
        this.dragStart = { x: startX, y: startY };
        this.selectedLayerStart = {
            x: this.selectedLayer.x || 0,
            y: this.selectedLayer.y || 0
        };
    }
    
    dragSelectedLayer(currentX, currentY) {
        if (!this.selectedLayer || !this.dragStart) return;
        
        const dx = currentX - this.dragStart.x;
        const dy = currentY - this.dragStart.y;
        
        this.selectedLayer.x = this.selectedLayerStart.x + dx;
        this.selectedLayer.y = this.selectedLayerStart.y + dy;
        
        this.elements.properties.transform.posX.value = this.selectedLayer.x;
        this.elements.properties.transform.posY.value = this.selectedLayer.y;
        
        this.editor.shouldRedraw = true;
    }
    
    startResizing(startX, startY) {
        this.isResizing = true;
        this.resizeStart = { x: startX, y: startY };
        this.selectedLayerStart = {
            width: this.selectedLayer.width || 100,
            height: this.selectedLayer.height || 100,
            scale: this.selectedLayer.scale || 1
        };
    }
    
    resizeSelectedLayer(currentX, currentY) {
        if (!this.selectedLayer || !this.resizeStart) return;
        
        const dx = currentX - this.resizeStart.x;
        const dy = currentY - this.resizeStart.y;
        
        // Calculate new scale
        const newWidth = this.selectedLayerStart.width + dx;
        const newHeight = this.selectedLayerStart.height + dy;
        const scaleX = newWidth / this.selectedLayerStart.width;
        const scaleY = newHeight / this.selectedLayerStart.height;
        const newScale = Math.min(scaleX, scaleY) * this.selectedLayerStart.scale;
        
        this.selectedLayer.scale = Math.max(0.1, newScale);
        this.elements.properties.transform.scale.value = this.selectedLayer.scale * 100;
        this.elements.properties.transform.scaleValue.textContent = `${Math.round(this.selectedLayer.scale * 100)}%`;
        
        this.editor.shouldRedraw = true;
    }
    
    startRotating(startX, startY) {
        this.isRotating = true;
        this.rotateStart = { x: startX, y: startY };
        this.selectedLayerStart = {
            rotation: this.selectedLayer.rotation || 0
        };
        
        // Calculate initial angle
        const dx = startX - this.selectedLayer.x;
        const dy = startY - this.selectedLayer.y;
        this.rotateStartAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    }
    
    rotateSelectedLayer(currentX, currentY) {
        if (!this.selectedLayer || !this.rotateStart) return;
        
        const dx = currentX - this.selectedLayer.x;
        const dy = currentY - this.selectedLayer.y;
        const currentAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const rotationDelta = currentAngle - this.rotateStartAngle;
        this.selectedLayer.rotation = this.selectedLayerStart.rotation + rotationDelta;
        
        // Normalize rotation to 0-360
        this.selectedLayer.rotation = ((this.selectedLayer.rotation % 360) + 360) % 360;
        
        this.elements.properties.transform.rotation.value = this.selectedLayer.rotation;
        this.elements.properties.transform.rotationValue.textContent = `${Math.round(this.selectedLayer.rotation)}°`;
        
        this.editor.shouldRedraw = true;
    }
    
    updateLayerSelectionUI() {
        // Update layer list
        document.querySelectorAll('.layer-item').forEach(item => {
            if (this.selectedLayer && item.dataset.layerId === this.selectedLayer.id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Update timeline tracks
        document.querySelectorAll('.timeline-track').forEach(track => {
            if (this.selectedLayer && track.dataset.layerId === this.selectedLayer.id) {
                track.classList.add('selected');
            } else {
                track.classList.remove('selected');
            }
        });
    }
    
    addTextLayer(x, y) {
        const layer = this.editor.addLayer({
            type: 'text',
            x: x,
            y: y,
            text: 'New Text',
            fontSize: 48,
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        });
        
        this.selectLayer(layer.id);
        this.showNotification('Text layer added', 'success');
    }
    
    startDrawingShape(startX, startY) {
        this.drawingShape = {
            startX,
            startY,
            type: 'rectangle'
        };
    }
    
    duplicateSelectedLayer() {
        if (!this.selectedLayer) return;
        
        const duplicated = this.editor.duplicateLayer(this.selectedLayer.id);
        if (duplicated) {
            this.selectLayer(duplicated.id);
            this.showNotification('Layer duplicated', 'success');
        }
    }
    
    copySelectedLayer() {
        if (!this.selectedLayer) return;
        
        this.copiedLayer = JSON.parse(JSON.stringify(this.selectedLayer));
        this.copiedLayer.id = null; // Clear ID for new layer
        this.showNotification('Layer copied to clipboard', 'info');
    }
    
    pasteLayer() {
        if (!this.copiedLayer) return;
        
        const newLayer = {
            ...this.copiedLayer,
            x: (this.copiedLayer.x || 0) + 20,
            y: (this.copiedLayer.y || 0) + 20
        };
        
        const addedLayer = this.editor.addLayer(newLayer);
        this.selectLayer(addedLayer.id);
        this.showNotification('Layer pasted', 'success');
    }
    
    deleteSelectedLayer() {
        if (!this.selectedLayer) return;
        
        if (confirm('Delete selected layer?')) {
            const layerId = this.selectedLayer.id;
            this.editor.removeLayer(layerId);
            this.selectedLayer = null;
            this.clearPropertiesPanel();
            this.updateLayerSelectionUI();
            this.showNotification('Layer deleted', 'info');
        }
    }
    
    toggleLayerVisibility(layerId = null) {
        if (layerId) {
            this.editor.toggleLayerVisibility(layerId);
        } else if (this.selectedLayer) {
            this.editor.toggleLayerVisibility(this.selectedLayer.id);
        }
        
        this.editor.shouldRedraw = true;
        this.updateUI();
    }
    
    toggleLayerLock(layerId = null) {
        if (layerId) {
            this.editor.toggleLayerLock(layerId);
        } else if (this.selectedLayer) {
            this.editor.toggleLayerLock(this.selectedLayer.id);
        }
        
        this.updateUI();
    }
    
    // ======================
    // CANVAS DRAWING METHODS
    // ======================
    
    drawImageLayer(ctx, layer, properties) {
        const image = this.editor.getAsset(layer.assetId);
        if (!image || !image.loaded) return;
        
        const width = layer.width || image.width || 100;
        const height = layer.height || image.height || 100;
        
        ctx.drawImage(
            image.element,
            -width / 2,
            -height / 2,
            width,
            height
        );
    }
    
    drawTextLayer(ctx, layer, properties) {
        const text = layer.text || 'Text';
        const fontSize = layer.fontSize || 48;
        const fontFamily = layer.fontFamily || 'Arial';
        const color = layer.color || '#ffffff';
        const align = layer.align || 'center';
        
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        
        // Split text into lines
        const lines = text.split('\n');
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        lines.forEach((line, index) => {
            const y = (index * lineHeight) - (totalHeight / 2) + (lineHeight / 2);
            ctx.fillText(line, 0, y);
        });
    }
    
    drawShapeLayer(ctx, layer, properties) {
        const type = layer.shapeType || 'rectangle';
        const width = layer.width || 100;
        const height = layer.height || 100;
        const fill = layer.fill || '#667eea';
        const stroke = layer.stroke || 'transparent';
        const strokeWidth = layer.strokeWidth || 0;
        
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        
        switch (type) {
            case 'rectangle':
                ctx.fillRect(-width/2, -height/2, width, height);
                if (strokeWidth > 0) {
                    ctx.strokeRect(-width/2, -height/2, width, height);
                }
                break;
                
            case 'circle':
                ctx.beginPath();
                ctx.arc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 2);
                ctx.fill();
                if (strokeWidth > 0) {
                    ctx.stroke();
                }
                break;
                
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(0, -height/2);
                ctx.lineTo(width/2, height/2);
                ctx.lineTo(-width/2, height/2);
                ctx.closePath();
                ctx.fill();
                if (strokeWidth > 0) {
                    ctx.stroke();
                }
                break;
        }
    }
    
    drawVideoLayer(ctx, layer, properties, time) {
        const video = this.editor.getAsset(layer.assetId);
        if (!video || !video.loaded) return;
        
        const width = layer.width || video.width || 100;
        const height = layer.height || video.height || 100;
        
        // Set video current time
        const videoTime = time - layer.startTime;
        if (video.element && videoTime >= 0 && videoTime <= video.duration) {
            video.element.currentTime = videoTime;
        }
        
        ctx.drawImage(
            video.element,
            -width / 2,
            -height / 2,
            width,
            height
        );
    }
    
    // ======================
    // CLEANUP
    // ======================
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        // Remove all event listeners
        this.eventHandlers.forEach((handler, key) => {
            const [elementId, eventType] = key.split('-');
            const element = this.elements[elementId];
            if (element) {
                element.removeEventListener(eventType, handler);
            }
        });
        
        this.eventHandlers.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}
