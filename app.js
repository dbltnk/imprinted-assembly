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

        // Set up event listeners
        this.setupEventListeners();

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

    setupEventListeners() {
        // Test buttons for debugging
        document.getElementById('test-log')?.addEventListener('click', () => {
            console.log('Test log message from button click');
        });

        document.getElementById('test-warn')?.addEventListener('click', () => {
            console.warn('Test warning message from button click');
        });

        document.getElementById('test-error')?.addEventListener('click', () => {
            console.error('Test error message from button click');
        });
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
        // Initialize header component
        const headerElement = document.getElementById('header');
        this.components.set('header', new HeaderComponent(headerElement));

        // Initialize sidebar component
        const sidebarElement = document.getElementById('sidebar');
        this.components.set('sidebar', new SidebarComponent(sidebarElement));

        // Initialize timeline component
        const timelineElement = document.getElementById('timeline');
        this.components.set('timeline', new TimelineComponent(timelineElement));

        // Initialize VU meter component
        const vuMeterElement = document.getElementById('vu-meter');
        this.components.set('vuMeter', new VUMeterComponent(vuMeterElement));
    }

    setupEventListeners() {
        // Project selection
        const header = this.components.get('header');
        header.addEventListener('projectSelected', (e) => {
            this.loadProject(e.detail.projectId);
        });

        // Transport controls
        const sidebar = this.components.get('sidebar');
        sidebar.addEventListener('transportAction', (e) => {
            this.handleTransportAction(e.detail.action);
        });

        // Track actions
        const timeline = this.components.get('timeline');
        timeline.addEventListener('trackAction', (e) => {
            this.handleTrackAction(e.detail.action, e.detail.trackId);
        });

        timeline.addEventListener('trackNameChange', (e) => {
            this.handleTrackNameChange(e.detail.trackId, e.detail.newName);
        });

        timeline.addEventListener('addTrack', () => {
            this.handleAddTrack();
        });

        timeline.addEventListener('clipDrop', (e) => {
            this.handleClipDrop(e.detail.clipId, e.detail.trackId, e.detail.x);
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
        this.components.get('sidebar').setProject(project);
        this.components.get('timeline').setProject(project);
        this.components.get('timeline').setCurrentTime(0);

        // Update file info
        this.updateFileInfo(project);

        // Update loop checkbox UI to reflect reset state
        this.updateLoopUI();

        console.log(`Project '${project.name}' loaded successfully`);
    }

    calculateTotalDuration() {
        if (!this.currentProject) return;

        let maxDuration = 0;
        this.currentProject.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const clipEnd = clip.startTime + clip.duration;
                maxDuration = Math.max(maxDuration, clipEnd);
            });
        });

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
        this.components.get('timeline').setProject(this.currentProject);
    }

    handleClipDrop(clipId, trackId, x) {
        console.log(`Clip drop: ${clipId} -> ${trackId} at x=${x}`);

        // Find the clip and track
        const clip = this.findClipById(clipId);
        const track = this.currentProject.tracks.find(t => t.id === trackId);

        if (!clip || !track) {
            console.warn('Clip or track not found');
            return;
        }

        // Calculate start time based on x position
        const startTime = Math.floor(x / PROJECT_CONFIG.layout.gridBeatWidth);

        // Create new clip instance
        const newClip = {
            ...clip,
            id: `${clip.id}-${Date.now()}`,
            startTime: startTime
        };

        // Add to track
        track.clips.push(newClip);

        // Re-render timeline
        this.components.get('timeline').setProject(this.currentProject);
    }

    findClipById(clipId) {
        // Search through all tracks for the clip
        for (const track of this.currentProject.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) return clip;
        }

        // Check extra clips for ambient project
        if (this.currentProject.extraClips) {
            return this.currentProject.extraClips.find(c => c.id === clipId);
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
        this.components.get('timeline').setPlaying(true);

        // Start VU meter animation
        this.components.get('vuMeter').startAnimation();

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
            this.components.get('timeline').setCurrentTime(this.currentTime);

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
        this.components.get('timeline').setPlaying(false);

        // Stop VU meter animation
        this.components.get('vuMeter').stopAnimation();

        // Stop time progression
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    stopPlayback() {
        console.log('Stopping playback');
        this.isPlaying = false;
        this.currentTime = 0;

        // Update UI
        this.updateTransportUI();
        this.components.get('timeline').setPlaying(false);
        this.components.get('timeline').setCurrentTime(0);

        // Stop VU meter animation
        this.components.get('vuMeter').stopAnimation();

        // Stop time progression
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    seek(direction) {
        const seekAmount = direction * 1; // 1 beat per seek
        this.currentTime = Math.max(0, Math.min(this.totalDuration, this.currentTime + seekAmount));

        console.log(`Seeking ${direction > 0 ? 'forward' : 'backward'} to ${this.currentTime.toFixed(1)}`);

        // Update timeline
        this.components.get('timeline').setCurrentTime(this.currentTime);
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        console.log(`Loop ${this.isLooping ? 'enabled' : 'disabled'}`);

        // Update loop toggle UI
        this.updateLoopUI();
    }

    updateLoopUI() {
        // Update the sidebar component's loop state
        this.components.get('sidebar').setLoopState(this.isLooping);
    }

    updateTransportUI() {
        // Update play button appearance
        const playButton = document.querySelector('[data-transport="play"]');
        if (playButton) {
            if (this.isPlaying) {
                playButton.classList.add('transport-button--play');
                playButton.textContent = '⏸'; // Pause icon
            } else {
                playButton.classList.remove('transport-button--play');
                playButton.textContent = '▶'; // Play icon
            }
        }
    }

    updateVUMeter() {
        // Simulate VU meter levels based on current playback
        // In a real implementation, this would come from audio analysis
        const baseLevel = 30 + Math.sin(this.currentTime * 0.5) * 20;
        const randomVariation = Math.random() * 20;
        const level = Math.max(0, Math.min(100, baseLevel + randomVariation));

        this.components.get('vuMeter').setLevel(level);
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
        // Stop playback
        this.stopPlayback();

        // Clean up components
        this.components.forEach(component => {
            if (component.destroy) {
                component.destroy();
            }
        });
        this.components.clear();

        console.log('Assembly Audio Editor destroyed');
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