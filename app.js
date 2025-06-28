/**
 * Assembly Audio Editor - Main Application
 * Modular audio editor with component-based architecture
 */

import { PROJECT_CONFIG, PROJECT_DATA, getProjectById } from './config.js';
import { HeaderComponent, SidebarComponent, TimelineComponent, VUMeterComponent } from './components.js';

// ===== BROWSER LOGGING SYSTEM =====
// Keep the existing logging system intact for debugging
class BrowserLogger {
    constructor() {
        this.logBuffer = [];
        this.lastDomSnapshot = null;
        this.logCount = 0;
        this.domUpdateCount = 0;
        this.serverUrl = 'http://localhost:3000';

        this.init();
    }

    init() {
        // Clear previous session logs on page load
        this.clearSession();

        // Process early logs that happened before initialization
        this.processEarlyLogs();

        // Override console methods (replace the early capture)
        this.overrideConsole();

        // Set up error handling to capture uncaught errors
        this.setupErrorHandling();

        // Set up periodic logging
        this.startPeriodicLogging();

        // Initial log
        console.log('Browser logging system initialized');
    }

    processEarlyLogs() {
        // Use the global earlyLogs captured from the very beginning
        const earlyLogs = window.earlyLogs || [];
        earlyLogs.forEach(log => {
            // Convert early log format to our buffer format
            const message = log.args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');

            this.logBuffer.push({
                timestamp: log.timestamp,
                type: log.type,
                message,
                callStack: log.callStack || []
            });
        });
        console.log(`Processed ${earlyLogs.length} early logs`);
    }

    clearSession() {
        // Send clear command to server
        fetch(`${this.serverUrl}/clear`, { method: 'POST' })
            .catch(err => console.warn('Could not clear previous session:', err));
    }

    setupErrorHandling() {
        // Capture uncaught errors
        window.addEventListener('error', (event) => {
            this.addToBuffer('ERROR', [`Uncaught error: ${event.message} at ${event.filename}:${event.lineno}`]);
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.addToBuffer('ERROR', [`Unhandled promise rejection: ${event.reason}`]);
        });
    }

    overrideConsole() {
        // Get the original console methods from the early capture
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        const originalInfo = console.info;

        // Replace the early capture with our full logging system
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.addToBuffer('LOG', args);
        };

        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.addToBuffer('WARN', args);
        };

        console.error = (...args) => {
            originalError.apply(console, args);
            this.addToBuffer('ERROR', args);
        };

        console.info = (...args) => {
            originalInfo.apply(console, args);
            this.addToBuffer('INFO', args);
        };
    }

    addToBuffer(type, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        // Get call stack information
        const stack = new Error().stack;
        const stackLines = stack ? stack.split('\n').slice(2) : []; // Skip Error constructor and this function

        // Parse stack to get file and line info
        const callInfo = stackLines.map(line => {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
            if (match) {
                return {
                    function: match[1],
                    file: match[2],
                    line: parseInt(match[3]),
                    column: parseInt(match[4])
                };
            }
            // Handle anonymous functions
            const anonMatch = line.match(/at\s+(.+?):(\d+):(\d+)/);
            if (anonMatch) {
                return {
                    function: '(anonymous)',
                    file: anonMatch[1],
                    line: parseInt(anonMatch[2]),
                    column: parseInt(anonMatch[3])
                };
            }
            return null;
        }).filter(Boolean);

        this.logBuffer.push({
            timestamp: new Date().toISOString(),
            type,
            message,
            callStack: callInfo
        });

        this.logCount++;
    }

    startPeriodicLogging() {
        setInterval(() => {
            this.sendLogs();
            this.sendDomSnapshot();
        }, 2000); // Every 2 seconds
    }

    async sendLogs() {
        if (this.logBuffer.length === 0) return;

        const logs = [...this.logBuffer];
        this.logBuffer = [];

        try {
            await fetch(`${this.serverUrl}/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logs })
            });
        } catch (err) {
            console.warn('Failed to send logs to server:', err);
        }
    }

    async sendDomSnapshot() {
        try {
            const snapshot = this.createDomSnapshot();
            const snapshotStr = JSON.stringify(snapshot);

            // Only send if DOM has changed
            if (this.lastDomSnapshot === snapshotStr) return;

            this.lastDomSnapshot = snapshotStr;
            this.domUpdateCount++;

            await fetch(`${this.serverUrl}/dom-snapshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(snapshot)
            });
        } catch (err) {
            console.warn('Failed to send DOM snapshot to server:', err);
        }
    }

    createDomSnapshot() {
        const snapshot = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            elements: []
        };

        try {
            // Get ALL elements in the document for complete coverage
            const allElements = document.querySelectorAll('*');

            allElements.forEach(element => {
                try {
                    const computedStyle = window.getComputedStyle(element);
                    const rect = element.getBoundingClientRect();

                    const elementData = {
                        tag: element.tagName.toLowerCase(),
                        id: element.id || null,
                        classes: Array.from(element.classList),
                        dataAttributes: this.getDataAttributes(element),
                        computedStyles: this.getRelevantStyles(computedStyle),
                        position: {
                            x: Math.round(rect.left),
                            y: Math.round(rect.top)
                        },
                        dimensions: {
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        },
                        textContent: element.textContent?.trim().substring(0, 100) || null,
                        innerHTML: element.innerHTML?.substring(0, 200) || null
                    };

                    // Add CSS conflict detection
                    const conflicts = this.detectCssConflicts(element, computedStyle);
                    if (conflicts.length > 0) {
                        elementData.cssConflicts = conflicts;
                    }

                    snapshot.elements.push(elementData);
                } catch (elementErr) {
                    console.warn('Failed to process element:', element, elementErr);
                }
            });
        } catch (err) {
            console.error('Failed to create DOM snapshot:', err);
            this.addToBuffer('ERROR', [`DOM snapshot failed: ${err.message}`]);
        }

        return snapshot;
    }

    getDataAttributes(element) {
        const dataAttrs = {};
        for (let attr of element.attributes) {
            if (attr.name.startsWith('data-')) {
                dataAttrs[attr.name] = attr.value;
            }
        }
        return Object.keys(dataAttrs).length > 0 ? dataAttrs : null;
    }

    getRelevantStyles(computedStyle) {
        // Only capture styles relevant for layout debugging
        const relevantProps = [
            'display', 'position', 'top', 'left', 'right', 'bottom',
            'width', 'height', 'margin', 'padding', 'border',
            'background-color', 'color', 'font-size', 'font-weight',
            'flex-direction', 'justify-content', 'align-items',
            'grid-template-columns', 'grid-template-rows',
            'z-index', 'opacity', 'visibility'
        ];

        const styles = {};
        relevantProps.forEach(prop => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value !== 'initial' && value !== 'normal') {
                styles[prop] = value;
            }
        });

        return styles;
    }

    detectCssConflicts(element, computedStyle) {
        const conflicts = [];

        // Check for common layout issues
        if (computedStyle.display === 'none' && computedStyle.visibility === 'visible') {
            conflicts.push('Element hidden by display:none but visibility:visible');
        }

        if (computedStyle.position === 'absolute' && !computedStyle.top && !computedStyle.left) {
            conflicts.push('Absolute positioned element without top/left coordinates');
        }

        if (computedStyle.width === '0px' && computedStyle.minWidth !== '0px') {
            conflicts.push('Element has zero width but non-zero min-width');
        }

        return conflicts;
    }
}

// ===== MAIN APPLICATION CLASS =====
class AssemblyApp {
    constructor() {
        this.currentProject = null;
        this.isPlaying = false;
        this.isLooping = false;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.playbackInterval = null;
        this.components = new Map();

        // Initialize logging system first
        this.logger = new BrowserLogger();

        this.init();
    }

    init() {
        console.log('Initializing Assembly Audio Editor');

        // Validate configuration
        this.validateConfiguration();

        // Initialize components
        this.initializeComponents();

        // Set up event listeners
        this.setupEventListeners();

        // Load default project
        this.loadProject('band');

        console.log('Assembly Audio Editor initialized successfully');
    }

    validateConfiguration() {
        assert(PROJECT_CONFIG, 'PROJECT_CONFIG is required');
        assert(PROJECT_DATA, 'PROJECT_DATA is required');

        // Validate that all required DOM elements exist
        const requiredElements = ['header', 'sidebar', 'timeline', 'vu-meter'];
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            assert(element, `Required element with id '${id}' not found`);
        });
    }

    initializeComponents() {
        // Initialize header
        const headerElement = document.getElementById('header');
        assert(headerElement, 'Header element not found');
        this.headerComponent = new HeaderComponent(headerElement);

        // Initialize sidebar
        const sidebarElement = document.getElementById('sidebar');
        assert(sidebarElement, 'Sidebar element not found');
        this.sidebarComponent = new SidebarComponent(sidebarElement);

        // Initialize timeline
        const timelineElement = document.getElementById('timeline');
        assert(timelineElement, 'Timeline element not found');
        this.timelineComponent = new TimelineComponent(timelineElement);

        // Initialize VU meter
        const vuMeterElement = document.getElementById('vu-meter');
        assert(vuMeterElement, 'VU meter element not found');
        this.vuMeterComponent = new VUMeterComponent(vuMeterElement);

        // Make timeline component globally accessible for inline event handlers
        window.assemblyApp = this;
    }

    setupEventListeners() {
        // Header events
        const header = this.headerComponent;
        header.addEventListener('menuItemClick', (e) => {
            this.handleMenuItemClick(e.detail.itemId);
        });

        header.addEventListener('windowControlClick', (e) => {
            this.handleWindowControlClick(e.detail.controlId);
        });

        header.addEventListener('projectSelected', (e) => {
            this.loadProject(e.detail.projectId);
        });

        // Sidebar events
        const sidebar = this.sidebarComponent;
        sidebar.addEventListener('transportAction', (e) => {
            this.handleTransportAction(e.detail.action);
        });

        // Timeline events
        const timeline = this.timelineComponent;
        timeline.addEventListener('trackAction', (e) => {
            this.handleTrackAction(e.detail.action, e.detail.trackId);
        });

        timeline.addEventListener('trackNameChange', (e) => {
            this.handleTrackNameChange(e.detail.trackId, e.detail.newName);
        });

        timeline.addEventListener('addTrack', () => {
            this.handleAddTrack();
        });

        // Project update events
        sidebar.addEventListener('projectUpdated', (e) => {
            this.sidebarComponent.setProject(e.detail.project);
        });

        timeline.addEventListener('projectUpdated', (e) => {
            this.timelineComponent.setProject(e.detail.project);
        });
    }

    loadProject(projectId) {
        console.log(`Loading project: ${projectId}`);

        const project = getProjectById(projectId);
        assert(project, `Project with id '${projectId}' not found`);

        // Stop any current playback
        this.stopPlayback();

        // Reset loop state when changing projects
        this.isLooping = false;

        this.currentProject = project;
        this.currentTime = 0;

        // Calculate total duration based on project clips
        this.calculateTotalDuration();

        // Update components with new project data
        this.sidebarComponent.setProject(project);
        this.timelineComponent.setProject(project);
        this.timelineComponent.setCurrentTime(0);

        // Update file info
        this.updateFileInfo(project);

        // Update loop checkbox UI to reflect reset state
        this.updateLoopUI();

        console.log(`Project '${project.name}' loaded successfully`);
    }

    calculateTotalDuration() {
        if (!this.currentProject) return;

        let maxDuration = 0;

        // Check clips in tracks
        this.currentProject.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const clipEnd = clip.startTime + clip.duration;
                maxDuration = Math.max(maxDuration, clipEnd);
            });
        });

        // For projects with no clips in tracks, use a default duration
        if (maxDuration === 0) {
            maxDuration = 16; // Default 16 beats
        }

        this.totalDuration = maxDuration;
        console.log(`Project duration: ${this.totalDuration} beats`);
    }

    updateFileInfo(project) {
        const fileInfoElement = document.querySelector('.file-info__name');
        if (fileInfoElement) {
            fileInfoElement.textContent = `${project.id}.ass`;
        }
    }

    handleTransportAction(action) {
        console.log(`Transport action: ${action}`);

        switch (action) {
            case 'play':
                this.togglePlayback();
                break;
            case 'stop':
                this.stopPlayback();
                break;
            case 'rewind':
                this.seek(-1);
                break;
            case 'fastForward':
                this.seek(1);
                break;
            case 'toggleLoop':
                this.toggleLoop();
                break;
            default:
                console.warn(`Unknown transport action: ${action}`);
        }
    }

    handleTrackAction(action, trackId) {
        console.log(`Track action: ${action} for track: ${trackId}`);

        switch (action) {
            case 'toggleSolo':
                this.toggleTrackSolo(trackId);
                break;
            case 'toggleMute':
                this.toggleTrackMute(trackId);
                break;
            default:
                console.warn(`Unknown track action: ${action}`);
        }
    }

    handleTrackNameChange(trackId, newName) {
        console.log(`Track name change: ${trackId} -> ${newName}`);

        // Update the track name in the current project
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (track) {
            track.name = newName;
        }
    }

    handleAddTrack() {
        console.log('Adding new track');

        if (!this.currentProject.allowTrackManagement) {
            console.warn('Track management not allowed for this project');
            return;
        }

        // Create new track
        const newTrack = {
            id: `track-${Date.now()}`,
            name: 'New Track',
            type: 'instrument',
            clips: []
        };

        this.currentProject.tracks.push(newTrack);

        // Re-render timeline
        this.timelineComponent.setProject(this.currentProject);
    }

    findClipById(clipId) {
        // Search in all tracks
        for (const track of this.currentProject.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) return clip;
        }

        // Search in sidebar clips
        if (this.currentProject.sidebarClips) {
            return this.currentProject.sidebarClips.find(c => c.id === clipId);
        }

        return null;
    }

    // ===== PLAYBACK CONTROL METHODS =====

    togglePlayback() {
        if (this.isPlaying) {
            this.pausePlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.isPlaying) return;

        console.log('Starting playback');
        this.isPlaying = true;

        // Update UI
        this.updateTransportUI();
        this.timelineComponent.setPlaying(true);

        // Start VU meter animation
        this.vuMeterComponent.startAnimation();

        // Start time progression
        this.playbackInterval = setInterval(() => {
            this.currentTime += 0.1;

            // Check for loop
            if (this.currentTime >= this.totalDuration) {
                if (this.isLooping) {
                    this.currentTime = 0;
                } else {
                    this.stopPlayback();
                    return;
                }
            }

            // Update timeline
            this.timelineComponent.setCurrentTime(this.currentTime);

            // Update VU meter with simulated levels
            this.updateVUMeter();
        }, 100);
    }

    pausePlayback() {
        if (!this.isPlaying) return;

        console.log('Pausing playback');
        this.isPlaying = false;

        // Update UI
        this.updateTransportUI();
        this.timelineComponent.setPlaying(false);

        // Stop VU meter animation
        this.vuMeterComponent.stopAnimation();

        // Stop time progression
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    stopPlayback() {
        if (!this.isPlaying && this.currentTime === 0) return;

        console.log('Stopping playback');
        this.isPlaying = false;
        this.currentTime = 0;

        // Update UI
        this.updateTransportUI();
        this.timelineComponent.setPlaying(false);
        this.timelineComponent.setCurrentTime(0);

        // Stop VU meter animation
        this.vuMeterComponent.stopAnimation();

        // Stop time progression
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    seek(direction) {
        const seekAmount = 1; // 1 beat
        this.currentTime = Math.max(0, this.currentTime + (direction * seekAmount));
        this.timelineComponent.setCurrentTime(this.currentTime);
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.updateLoopUI();
    }

    updateLoopUI() {
        this.sidebarComponent.setLoopState(this.isLooping);
    }

    updateTransportUI() {
        // Update play button state
        const playButton = document.querySelector('[data-transport="play"]');
        if (playButton) {
            playButton.textContent = this.isPlaying ? '⏸' : '▶';
        }
    }

    updateVUMeter() {
        // Simulate VU meter levels based on current time and clips
        const level = Math.random() * 0.8 + 0.2; // Random level between 0.2 and 1.0
        this.vuMeterComponent.setLevel(level);
    }

    toggleTrackSolo(trackId) {
        console.log(`Toggling solo for track: ${trackId}`);
        // Solo functionality would be implemented here
        // For now, just log the action
    }

    toggleTrackMute(trackId) {
        console.log(`Toggling mute for track: ${trackId}`);
        // Mute functionality would be implemented here
        // For now, just log the action
    }

    destroy() {
        // Clean up event listeners
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });

        // Clear intervals
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
        }
        if (this.vuMeterInterval) {
            clearInterval(this.vuMeterInterval);
        }

        console.log('Assembly Audio Editor destroyed');
    }

    // ===== DROP HANDLERS =====
    handleSidebarClipDrop(dragData, trackId, startTime) {
        console.log('Handling sidebar clip drop:', { dragData, trackId, startTime });

        // Find the clip in sidebar clips
        const sidebarClipIndex = this.currentProject.sidebarClips.findIndex(c => c.id === dragData.clipId);
        if (sidebarClipIndex === -1) {
            console.error('Clip not found in sidebar:', dragData.clipId);
            return;
        }

        const sidebarClip = this.currentProject.sidebarClips[sidebarClipIndex];

        // Create new clip instance for the track
        const newClip = {
            ...sidebarClip,
            startTime: startTime
        };

        // Add to track
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (track) {
            track.clips.push(newClip);

            // Remove from sidebar clips
            this.currentProject.sidebarClips.splice(sidebarClipIndex, 1);

            console.log('Added clip to track:', { trackId, clipId: newClip.id, startTime });

            // Update components
            this.updateComponents();
        }
    }

    handleTimelineClipMove(dragData, targetTrackId, newStartTime) {
        console.log('Handling timeline clip move:', { dragData, targetTrackId, newStartTime });

        // Remove from original track
        const sourceTrack = this.currentProject.tracks.find(t => t.id === dragData.trackId);
        if (sourceTrack) {
            const clipIndex = sourceTrack.clips.findIndex(c => c.id === dragData.clipId);
            if (clipIndex !== -1) {
                const clip = sourceTrack.clips.splice(clipIndex, 1)[0];

                // Update clip start time
                clip.startTime = newStartTime;

                // Add to target track
                const targetTrack = this.currentProject.tracks.find(t => t.id === targetTrackId);
                if (targetTrack) {
                    targetTrack.clips.push(clip);
                    console.log('Moved clip:', {
                        fromTrack: dragData.trackId,
                        toTrack: targetTrackId,
                        clipId: clip.id,
                        newStartTime
                    });

                    // Update components
                    this.updateComponents();
                }
            }
        }
    }

    updateComponents() {
        // Update timeline
        if (this.timelineComponent) {
            this.timelineComponent.setProject(this.currentProject);
        }

        // Update sidebar
        if (this.sidebarComponent) {
            this.sidebarComponent.setProject(this.currentProject);
        }
    }

    cleanupDropPreviews() {
        // Clean up all drop previews from the timeline
        if (this.timelineComponent) {
            const previews = document.querySelectorAll('.clip-drop-preview');
            previews.forEach(preview => preview.remove());
        }
    }

    handleMenuItemClick(itemId) {
        console.log(`Menu item clicked: ${itemId}`);

        if (itemId === 'load') {
            // Load dropdown is handled by the header component
            return;
        }

        // Handle other menu items
        switch (itemId) {
            case 'save':
            case 'analyze':
            case 'details':
            case 'settings':
            case 'help':
            case 'license':
                console.log(`Menu item '${itemId}' is not implemented yet`);
                break;
            default:
                console.warn(`Unknown menu item: ${itemId}`);
        }
    }

    handleWindowControlClick(controlId) {
        console.log(`Window control clicked: ${controlId}`);

        switch (controlId) {
            case 'minimize':
            case 'maximize':
            case 'close':
                console.log(`Window control '${controlId}' is not implemented yet`);
                break;
            default:
                console.warn(`Unknown window control: ${controlId}`);
        }
    }
}

// ===== UTILITY FUNCTIONS =====
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assembly App Error: ${message}`);
    }
}

// ===== INITIALIZATION =====
let app = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new AssemblyApp();
    });
} else {
    app = new AssemblyApp();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// Export for debugging
window.AssemblyApp = AssemblyApp;

// ===== GLOBAL DROP HANDLER =====
// This function is called by the inline ondrop handlers in track clips areas
window.handleTrackDrop = function (event, trackId) {
    console.log('Global drop handler called for track:', trackId);
    event.preventDefault();

    try {
        const dragData = JSON.parse(event.dataTransfer.getData('application/json'));
        console.log('Drag data in global handler:', dragData);

        // Calculate drop position
        const trackElement = event.target.closest('.track__clips-area');
        const rect = trackElement.getBoundingClientRect();
        const x = event.clientX - rect.left;

        // Snap to beat grid
        const beatWidth = PROJECT_CONFIG.layout.gridBeatWidth;
        const startTime = Math.round(x / beatWidth);

        // Get clip duration from drag data
        const clipDuration = dragData.clipDuration || 1;
        const endTime = startTime + clipDuration;

        // Check for collisions (excluding the dragged clip)
        const existingClips = trackElement.querySelectorAll('[data-clip-id]');
        let hasCollision = false;

        existingClips.forEach(clipElement => {
            // Skip the clip being dragged
            if (dragData.type === 'timeline-clip' &&
                clipElement.dataset.clipId === dragData.clipId) {
                return; // Skip this clip
            }

            const existingStart = parseFloat(clipElement.dataset.clipStartTime);
            const existingDuration = parseFloat(clipElement.dataset.clipDuration);
            const existingEnd = existingStart + existingDuration;

            // Check if new clip overlaps with existing clip
            if ((startTime < existingEnd) && (endTime > existingStart)) {
                hasCollision = true;
            }
        });

        const dropPosition = {
            startTime,
            endTime,
            isValid: !hasCollision && startTime >= 0
        };

        console.log('Drop position calculated:', dropPosition);

        if (dropPosition.isValid) {
            // Handle the drop based on type
            if (dragData.type === 'sidebar-clip') {
                // Adding new clip from sidebar
                window.assemblyApp.handleSidebarClipDrop(dragData, trackId, dropPosition.startTime);
            } else if (dragData.type === 'timeline-clip') {
                // Moving existing clip
                window.assemblyApp.handleTimelineClipMove(dragData, trackId, dropPosition.startTime);
            }
        } else {
            console.log('Invalid drop position - collision detected');
        }

        // Clean up drop previews
        window.assemblyApp.cleanupDropPreviews();

    } catch (error) {
        console.error('Error in global drop handler:', error);
    }

    // Clear global drag data
    if (window.globalDragData) {
        window.globalDragData = null;
    }
};

// ===== APPLICATION INITIALIZATION ===== 