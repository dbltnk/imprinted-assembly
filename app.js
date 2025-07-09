/**
 * Assembly Audio Editor - Main Application
 * Modular audio editor with component-based architecture
 */

import { PROJECT_CONFIG, PROJECT_DATA, getProjectById } from './config.js';
import { HeaderComponent, SidebarComponent, TimelineComponent, VUMeterComponent } from './components.js';
import { assert, createConsoleOverride, parseCallStack, formatMessage, createCustomEvent } from './utils.js';

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
        this.clearSession();
        this.processEarlyLogs();
        this.overrideConsole();
        this.setupErrorHandling();
        this.startPeriodicLogging();
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
        const originalMethods = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
        };

        const consoleOverride = createConsoleOverride(originalMethods, (type, args) => {
            this.addToBuffer(type, args);
        });
        Object.assign(console, consoleOverride);
    }

    addToBuffer(type, args) {
        const message = formatMessage(args);
        const callInfo = parseCallStack();

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
            const allElements = document.querySelectorAll('*');
            allElements.forEach(element => {
                const elementData = this.processElement(element);
                if (elementData) {
                    snapshot.elements.push(elementData);
                }
            });
        } catch (err) {
            console.error('Failed to create DOM snapshot:', err);
            this.addToBuffer('ERROR', [`DOM snapshot failed: ${err.message}`]);
        }

        return snapshot;
    }

    processElement(element) {
        try {
            const elementData = this.createElementData(element);
            const conflicts = this.detectCssConflicts(element, window.getComputedStyle(element));
            if (conflicts.length > 0) {
                elementData.cssConflicts = conflicts;
            }
            return elementData;
        } catch (elementErr) {
            console.warn('Failed to process element:', element, elementErr);
            return null;
        }
    }

    createElementData(element) {
        const computedStyle = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
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
        this.playbackInterval = null;

        // Initialize logging system first
        this.logger = new BrowserLogger();

        this.init();
    }

    init() {
        console.log('Initializing Assembly Audio Editor');
        this.validateConfiguration();
        this.initializeComponents();
        this.setupEventListeners();
        this.loadProject('band');
        console.log('Assembly Audio Editor initialized successfully');
    }

    validateConfiguration() {
        assert(PROJECT_CONFIG, 'PROJECT_CONFIG is required');
        assert(PROJECT_DATA, 'PROJECT_DATA is required');

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
        // Project selection
        this.headerComponent.element.addEventListener('projectSelected', (e) => {
            this.loadProject(e.detail.projectId);
        });

        // Transport controls
        this.sidebarComponent.element.addEventListener('transportAction', (e) => {
            this.handleTransportAction(e.detail.action);
        });

        // Track actions
        this.timelineComponent.element.addEventListener('trackAction', (e) => {
            this.handleTrackAction(e.detail.action, e.detail.trackId);
        });

        // Track name changes
        this.timelineComponent.element.addEventListener('trackNameChanged', (e) => {
            this.handleTrackNameChange(e.detail.trackId, e.detail.newName);
        });

        // Add track
        this.timelineComponent.element.addEventListener('addTrack', () => {
            this.handleAddTrack();
        });

        // Track management events
        this.timelineComponent.element.addEventListener('trackAdded', (e) => {
            this.handleTrackAdded(e.detail.track);
        });

        this.timelineComponent.element.addEventListener('trackRemoved', (e) => {
            this.handleTrackRemoved(e.detail.trackId, e.detail.track);
        });

        this.timelineComponent.element.addEventListener('trackSoloChanged', (e) => {
            this.handleTrackSoloChanged(e.detail.trackId, e.detail.soloed);
        });

        this.timelineComponent.element.addEventListener('trackMuteChanged', (e) => {
            this.handleTrackMuteChanged(e.detail.trackId, e.detail.muted);
        });

        // Clip events
        this.timelineComponent.element.addEventListener('clipResized', (e) => {
            this.handleClipResized(e.detail);
        });

        this.timelineComponent.element.addEventListener('clipAdded', (e) => {
            this.handleClipAdded(e.detail);
        });

        this.timelineComponent.element.addEventListener('clipMoved', (e) => {
            this.handleClipMoved(e.detail);
        });

        // Sidebar clip drops
        this.sidebarComponent.element.addEventListener('sidebarClipDrop', (e) => {
            this.handleSidebarClipDrop(e.detail.dragData, e.detail.trackId, e.detail.startTime);
        });

        // Timeline clip moves
        this.timelineComponent.element.addEventListener('timelineClipMove', (e) => {
            this.handleTimelineClipMove(e.detail.dragData, e.detail.targetTrackId, e.detail.newStartTime);
        });

        this.setupGlobalDragAndDrop();

        // Menu item clicks
        this.headerComponent.element.addEventListener('menuItemClick', (e) => {
            this.handleMenuItemClick(e.detail.itemId);
        });

        // Window control clicks
        this.headerComponent.element.addEventListener('windowControlClick', (e) => {
            this.handleWindowControlClick(e.detail.controlId);
        });
    }

    // ===== TRACK VALIDATION LOGIC =====
    validateClipDrop(clipType, trackId) {
        assert(clipType, 'Clip type is required');
        assert(trackId, 'Track ID is required');
        assert(this.currentProject, 'Current project is required');

        // Find the track
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) {
            console.warn(`Track not found: ${trackId}`);
            return false;
        }

        return this.canClipGoOnTrack(clipType, track.type, track.name, this.currentProject.id);
    }

    canClipGoOnTrack(clipType, trackType, trackName, projectId) {
        assert(clipType, 'Clip type is required');
        assert(trackType, 'Track type is required');
        assert(trackName, 'Track name is required');
        assert(projectId, 'Project ID is required');

        // Sentence project: everything can go everywhere
        if (projectId === 'sentence') {
            return true;
        }

        // Ambient project: everything can go everywhere
        if (projectId === 'ambient') {
            return true;
        }

        // Band project: clips must match track types
        if (projectId === 'band') {
            return clipType === trackType;
        }

        // Song project: specific restrictions
        if (projectId === 'song') {
            // Viola clips only fit Viola tracks
            if (clipType === 'viola') {
                return this.isViolaTrack(trackName);
            }

            // Vince clips only fit Vince tracks  
            if (clipType === 'vince') {
                return this.isVinceTrack(trackName);
            }

            // Other clips can go anywhere
            return true;
        }

        // Default: allow everything
        return true;
    }

    isViolaTrack(trackName) {
        // In the song project, Viola tracks are identified by their names
        return trackName.toLowerCase().includes('viola');
    }

    isVinceTrack(trackName) {
        // In the song project, Vince tracks are identified by their names
        return trackName.toLowerCase().includes('vince');
    }

    // ===== VISUAL FEEDBACK FOR DRAG OPERATIONS =====
    updateTrackVisualFeedback(dragData) {
        if (!dragData || !this.currentProject) return;

        const clipType = dragData.clipType;
        const allTracks = document.querySelectorAll('.track');

        allTracks.forEach(trackElement => {
            const trackId = trackElement.dataset.trackId;
            const track = this.currentProject.tracks.find(t => t.id === trackId);

            if (!track) return;

            const isValid = this.canClipGoOnTrack(clipType, track.type, track.name, this.currentProject.id);

            // Remove existing feedback classes
            trackElement.classList.remove('track--valid-drop', 'track--invalid-drop');

            // Add appropriate feedback class
            if (isValid) {
                trackElement.classList.add('track--valid-drop');
            } else {
                trackElement.classList.add('track--invalid-drop');
            }
        });
    }

    clearTrackVisualFeedback() {
        const allTracks = document.querySelectorAll('.track');
        allTracks.forEach(trackElement => {
            trackElement.classList.remove('track--valid-drop', 'track--invalid-drop');
        });
    }

    loadProject(projectId) {
        console.log(`Loading project: ${projectId}`);

        // Clear current state
        this.clearCurrentState();

        // Get project data
        const project = getProjectById(projectId);
        if (!project) {
            console.error(`Project not found: ${projectId}`);
            return;
        }

        // Validate project structure
        this.validateProject(project);

        // Set current project
        this.currentProject = { ...project };

        // Update file info
        this.updateFileInfo(project);

        // Update components with new project
        this.updateComponents();

        console.log(`Project '${project.name}' loaded successfully`);
    }

    clearCurrentState() {
        // Clear playback state
        this.isPlaying = false;
        this.currentTime = 0;
        this.isLooping = false;

        // Clear any existing clips from tracks
        if (this.currentProject) {
            this.currentProject.tracks.forEach(track => {
                track.clips = [];
                track.muted = false;
                track.soloed = false;
            });
        }

        // Clear global drag data
        window.globalDragData = null;

        // Clear visual feedback
        this.clearTrackVisualFeedback();

        // Update transport UI
        this.updateTransportUI();
        this.updateLoopUI();
    }

    validateProject(project) {
        assert(project, 'Project is required');
        assert(project.id, 'Project must have an id');
        assert(project.name, 'Project must have a name');
        assert(project.bpm, 'Project must have a bpm');
        assert(project.tracks, 'Project must have tracks');
        assert(Array.isArray(project.tracks), 'Project tracks must be an array');
        assert(project.tracks.length > 0, 'Project must have at least one track');

        project.tracks.forEach((track, index) => {
            assert(track.id, `Track ${index} must have an id`);
            assert(track.name, `Track ${index} must have a name`);
            assert(track.type, `Track ${index} must have a type`);
            assert(track.clips, `Track ${index} must have clips`);
            assert(Array.isArray(track.clips), `Track ${index} clips must be an array`);
        });
    }

    updateFileInfo(project) {
        // File info is now handled by the sidebar component
        // The sidebar will automatically update when the project is set
        console.log(`File info updated for project: ${project.id}`);
    }

    handleTransportAction(action) {
        assert(action, 'Transport action is required');
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
        assert(action, 'Track action is required');
        assert(trackId, 'Track ID is required');
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
        assert(trackId, 'Track ID is required');
        assert(newName, 'New track name is required');
        console.log(`Track name change: ${trackId} -> ${newName}`);

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

    // ===== PLAYBACK CONTROL METHODS =====

    togglePlayback() {
        this.isPlaying ? this.pausePlayback() : this.startPlayback();
    }

    startPlayback() {
        if (this.isPlaying) return;

        console.log('Starting playback');
        this.isPlaying = true;
        this.updateTransportUI();
        this.timelineComponent.setPlaying(true);
        this.vuMeterComponent.startAnimation();
        this.startTimeProgression();
    }

    pausePlayback() {
        if (!this.isPlaying) return;

        console.log('Pausing playback');
        this.isPlaying = false;
        this.updateTransportUI();
        this.timelineComponent.setPlaying(false);
        this.vuMeterComponent.stopAnimation();
        this.stopTimeProgression();
    }

    stopPlayback() {
        if (!this.isPlaying && this.currentTime === 0) return;

        console.log('Stopping playback');
        this.isPlaying = false;
        this.currentTime = 0;
        this.updateTransportUI();
        this.timelineComponent.setPlaying(false);
        this.timelineComponent.setCurrentTime(0);
        this.sidebarComponent.setCurrentTime(0);
        this.vuMeterComponent.stopAnimation();
        this.stopTimeProgression();
    }

    seek(direction) {
        const seekAmount = 1; // 1 beat
        this.currentTime = Math.max(0, this.currentTime + (direction * seekAmount));
        this.timelineComponent.setCurrentTime(this.currentTime);
        this.sidebarComponent.setCurrentTime(this.currentTime);
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
        const level = Math.random() * 80 + 10; // Random level between 0.2 and 1.0
        this.vuMeterComponent.setLevel(level);
    }

    toggleTrackSolo(trackId) {
        console.log(`Toggling solo for track: ${trackId}`);

        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) return;

        // Toggle solo state
        track.soloed = !track.soloed;

        // If this track is being soloed, unsolo all others
        if (track.soloed) {
            this.currentProject.tracks.forEach(t => {
                if (t.id !== trackId) {
                    t.soloed = false;
                }
            });
        }

        // Update components
        this.updateComponents();

        // Dispatch event
        const event = createCustomEvent('trackSoloChanged', { trackId, soloed: track.soloed });
        this.element.dispatchEvent(event);
    }

    toggleTrackMute(trackId) {
        console.log(`Toggling mute for track: ${trackId}`);

        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) return;

        // Toggle mute state
        track.muted = !track.muted;

        // Update components
        this.updateComponents();

        // Dispatch event
        const event = createCustomEvent('trackMuteChanged', { trackId, muted: track.muted });
        this.element.dispatchEvent(event);
    }

    destroy() {
        // Clear intervals
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
        }

        console.log('Assembly Audio Editor destroyed');
    }

    // ===== DROP HANDLERS =====
    handleSidebarClipDrop(dragData, trackId, startTime) {
        // Validate that the clip can be dropped on this track
        if (!this.validateClipDrop(dragData.clipType, trackId)) {
            console.warn(`Cannot drop ${dragData.clipType} clip on track ${trackId}`);
            return;
        }

        const sidebarClipIndex = this.currentProject.sidebarClips.findIndex(c => c.id === dragData.clipId);
        if (sidebarClipIndex === -1) {
            console.error('Clip not found in sidebar:', dragData.clipId);
            return;
        }

        const sidebarClip = this.currentProject.sidebarClips[sidebarClipIndex];
        const newClip = { ...sidebarClip, startTime };
        const track = this.currentProject.tracks.find(t => t.id === trackId);

        if (track) {
            track.clips.push(newClip);
            // Don't remove from sidebar - allow multiple copies
            console.log('Added clip to track:', { trackId, clipId: newClip.id, startTime });
            this.updateComponents();
            // Refresh sidebar to show updated usage
            if (this.sidebarComponent) {
                this.sidebarComponent.refreshClipRepository();
            }
        }
    }

    handleTimelineClipMove(dragData, targetTrackId, newStartTime) {
        // Validate that the clip can be moved to this track
        if (!this.validateClipDrop(dragData.clipType, targetTrackId)) {
            console.warn(`Cannot move ${dragData.clipType} clip to track ${targetTrackId}`);
            return;
        }

        const sourceTrack = this.currentProject.tracks.find(t => t.id === dragData.trackId);
        const targetTrack = this.currentProject.tracks.find(t => t.id === targetTrackId);

        if (!sourceTrack || !targetTrack) {
            console.error(`Track not found: source=${dragData.trackId}, target=${targetTrackId}`);
            return;
        }

        const clipIndex = sourceTrack.clips.findIndex(c => c.id === dragData.clipId);
        if (clipIndex === -1) {
            console.error(`Clip not found: ${dragData.clipId}`);
            return;
        }

        const clip = sourceTrack.clips.splice(clipIndex, 1)[0];
        clip.startTime = newStartTime;
        targetTrack.clips.push(clip);

        console.log('Moved clip:', {
            fromTrack: dragData.trackId,
            toTrack: targetTrackId,
            clipId: clip.id,
            newStartTime
        });

        this.updateComponents();
        // Refresh sidebar to show updated usage
        if (this.sidebarComponent) {
            this.sidebarComponent.refreshClipRepository();
        }
    }

    handleClipRemoval(dragData) {
        assert(dragData, 'Drag data is required for clip removal');
        assert(dragData.type === 'timeline-clip', 'Only timeline clips can be removed');
        assert(dragData.sourceTrackId, 'Source track ID is required');
        assert(dragData.clipId, 'Clip ID is required');

        const sourceTrack = this.currentProject.tracks.find(t => t.id === dragData.sourceTrackId);
        if (!sourceTrack) {
            console.error(`Track not found: ${dragData.sourceTrackId}`);
            return;
        }

        const clipIndex = sourceTrack.clips.findIndex(c => c.id === dragData.clipId);
        if (clipIndex === -1) {
            console.error(`Clip not found: ${dragData.clipId}`);
            return;
        }

        const removedClip = sourceTrack.clips.splice(clipIndex, 1)[0];

        console.log('Removed clip:', {
            fromTrack: dragData.sourceTrackId,
            clipId: removedClip.id,
            clipName: removedClip.name
        });

        this.updateComponents();
        // Refresh sidebar to show updated usage
        if (this.sidebarComponent) {
            this.sidebarComponent.refreshClipRepository();
        }
    }

    updateComponents() {
        // Update timeline
        if (this.timelineComponent) {
            this.timelineComponent.setProject(this.currentProject);
            // Update button states after setting project
            this.timelineComponent.updateTrackButtonStates();
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
        assert(itemId, 'Menu item ID is required');
        console.log(`Menu item clicked: ${itemId}`);

        if (itemId === 'load') {
            return;
        }
    }

    handleWindowControlClick(controlId) {
        assert(controlId, 'Window control ID is required');
        console.log(`Window control clicked: ${controlId}`);
    }

    setupGlobalDragAndDrop() {
        document.addEventListener('drop', (e) => {
            const trackElement = e.target.closest('.track');

            if (window.globalDragData) {
                if (trackElement) {
                    // Drop on a track
                    console.log(`Global drop handler called for track: ${trackElement.dataset.trackId}`);
                    console.log(`Drag data in global handler:`, window.globalDragData);

                    const dropPosition = this.timelineComponent.calculateDropPosition(e, trackElement);
                    console.log(`Drop position calculated:`, dropPosition);

                    if (dropPosition.isValid) {
                        const trackId = trackElement.dataset.trackId;
                        const startTime = dropPosition.startTime;

                        if (window.globalDragData.type === 'sidebar-clip') {
                            this.handleSidebarClipDrop(window.globalDragData, trackId, startTime);
                        } else if (window.globalDragData.type === 'timeline-clip') {
                            this.handleTimelineClipMove(window.globalDragData, trackId, startTime);
                        }
                    }
                } else {
                    // Drop outside of any track (including sidebar) - remove the clip
                    console.log(`Global drop handler called outside of tracks`);
                    console.log(`Drag data in global handler:`, window.globalDragData);

                    if (window.globalDragData.type === 'timeline-clip') {
                        this.handleClipRemoval(window.globalDragData);
                    }
                }

                window.globalDragData = null;
                this.clearTrackVisualFeedback();
            }
        });

        document.addEventListener('dragover', (e) => {
            const trackElement = e.target.closest('.track');
            if (trackElement && window.globalDragData) {
                e.preventDefault();
                const dropPosition = this.timelineComponent.calculateDropPosition(e, trackElement);

                if (dropPosition.isValid) {
                    e.dataTransfer.dropEffect = 'copy';
                    this.timelineComponent.showDropPreview(trackElement, dropPosition);
                } else {
                    e.dataTransfer.dropEffect = 'none';
                    this.timelineComponent.hideDropPreview(trackElement);
                }
            } else if (window.globalDragData && window.globalDragData.type === 'timeline-clip') {
                // Allow dropping timeline clips anywhere (including sidebar) to remove them
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });

        document.addEventListener('dragleave', (e) => {
            const trackElement = e.target.closest('.track');
            if (trackElement) {
                this.timelineComponent.hideDropPreview(trackElement);
            }
        });

        // Global drag end cleanup
        document.addEventListener('dragend', (e) => {
            // Clear global drag data and cleanup previews
            window.globalDragData = null;
            this.clearTrackVisualFeedback();
            if (this.timelineComponent) {
                this.timelineComponent.cleanupDropPreviews();
            }
        });

        // Add drag start handler to update visual feedback
        document.addEventListener('dragstart', (e) => {
            if (window.globalDragData) {
                this.updateTrackVisualFeedback(window.globalDragData);
            }
        });
    }

    handleTrackAdded(track) {
        console.log(`Track added: ${track.name}`);
        // Update components to reflect new track
        this.updateComponents();
    }

    handleTrackRemoved(trackId, track) {
        console.log(`Track removed: ${track.name}`);
        // Update components to reflect removed track
        this.updateComponents();
    }

    handleTrackSoloChanged(trackId, soloed) {
        console.log(`Track ${trackId} solo changed: ${soloed}`);
        // Update VU meter or other solo-dependent UI
        this.updateVUMeter();
    }

    handleTrackMuteChanged(trackId, muted) {
        console.log(`Track ${trackId} mute changed: ${muted}`);
        // Update VU meter or other mute-dependent UI
        this.updateVUMeter();
    }

    handleClipResized(detail) {
        const { trackId, clipId, newStartTime, newDuration } = detail;
        console.log(`Clip resized: ${clipId} in track ${trackId} to ${newStartTime}s for ${newDuration}s`);

        // Update the clip data in the project
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (track) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) {
                clip.startTime = newStartTime;
                clip.duration = newDuration;
            }
        }
    }

    handleClipAdded(detail) {
        const { trackId, clip } = detail;
        console.log(`Clip added: ${clip.id} to track ${trackId}`);
    }

    handleClipMoved(detail) {
        const { clipId, sourceTrackId, targetTrackId, newStartTime } = detail;
        console.log(`Clip moved: ${clipId} from ${sourceTrackId} to ${targetTrackId} at ${newStartTime}`);
    }

    stopTimeProgression() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    startTimeProgression() {
        this.playbackInterval = setInterval(() => {
            this.currentTime += 0.1;

            // Use a reasonable default duration (16 beats = 64 seconds at 120 BPM)
            const defaultDuration = 64;
            if (this.currentTime >= defaultDuration) {
                if (this.isLooping) {
                    this.currentTime = 0;
                } else {
                    this.stopPlayback();
                    return;
                }
            }

            this.timelineComponent.setCurrentTime(this.currentTime);
            this.sidebarComponent.setCurrentTime(this.currentTime);
            this.updateVUMeter();
        }, 100);
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