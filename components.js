/**
 * Assembly Audio Editor - UI Components
 * Modular component system for building the audio editor interface
 */

import { PROJECT_CONFIG, PROJECT_DATA, CLIP_CATEGORIES, getCategoryByType } from './config.js';

// ===== GLOBAL VARIABLES =====
// Remove the local globalDragData variable since we're using window.globalDragData
// let globalDragData = null;

// ===== COMPONENT BASE CLASS =====
class Component {
    constructor(element, config = {}) {
        assert(element, 'Component requires a DOM element');
        this.element = element;
        this.config = config;
        this.children = new Map();
        this.eventListeners = new Map();
        this.init();
    }

    init() {
        // Override in subclasses
    }

    render() {
        // Override in subclasses
    }

    destroy() {
        // Remove event listeners if they exist
        if (this._boundClickHandler) {
            this.element.removeEventListener('click', this._boundClickHandler);
        }
        if (this._boundChangeHandler) {
            this.element.removeEventListener('change', this._boundChangeHandler);
        }
        if (this._boundDragStartHandler) {
            this.element.removeEventListener('dragstart', this._boundDragStartHandler);
        }

        // Clear the element
        this.element.innerHTML = '';
    }

    addEventListener(event, listener) {
        this.element.addEventListener(event, listener);
        this.eventListeners.set(event, listener);
    }

    removeEventListener(event) {
        const listener = this.eventListeners.get(event);
        if (listener) {
            this.element.removeEventListener(event, listener);
            this.eventListeners.delete(event);
        }
    }
}

// ===== HEADER COMPONENT =====
class HeaderComponent extends Component {
    init() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        const { menu, windowControls } = PROJECT_CONFIG;

        this.element.innerHTML = `
            <span class="header__logo">🎛️</span>
            <span class="header__title">${PROJECT_CONFIG.app.name}</span>
            <nav class="header__nav">
                ${menu.items.map(item => this.renderMenuItem(item)).join('')}
            </nav>
            <div class="header__window-controls">
                ${windowControls.map(control => this.renderWindowControl(control)).join('')}
            </div>
        `;
    }

    renderMenuItem(item) {
        const disabledClass = item.disabled ? 'header__nav-button--disabled' : '';
        const activeClass = item.hasDropdown ? 'header__nav-button--active' : '';

        return `
            <button class="header__nav-button ${disabledClass} ${activeClass}" 
                    data-menu-item="${item.id}"
                    ${item.disabled ? 'disabled' : ''}>
                ${item.label} ${item.hasDropdown ? '<span class="ml-1">▼</span>' : ''}
            </button>
        `;
    }

    renderWindowControl(control) {
        const className = control.className ? `header__window-button--${control.className}` : '';
        return `
            <button class="header__window-button ${className}" 
                    title="${control.title}" 
                    data-window-control="${control.id}">
                ${control.icon}
            </button>
        `;
    }

    setupEventListeners() {
        // Menu item clicks
        this.element.addEventListener('click', (e) => {
            const menuItem = e.target.closest('[data-menu-item]');
            if (menuItem) {
                const itemId = menuItem.dataset.menuItem;
                this.handleMenuItemClick(itemId);
            }

            const windowControl = e.target.closest('[data-window-control]');
            if (windowControl) {
                const controlId = windowControl.dataset.windowControl;
                this.handleWindowControlClick(controlId);
            }
        });
    }

    handleMenuItemClick(itemId) {
        if (itemId === 'load') {
            this.showProjectDropdown();
        }
        // Other menu items are disabled for now
    }

    handleWindowControlClick(controlId) {
        // Window controls are placeholders for now
        console.log(`Window control clicked: ${controlId}`);
    }

    showProjectDropdown() {
        // Remove any existing dropdown first
        const existingDropdown = document.querySelector('.project-dropdown');
        if (existingDropdown && existingDropdown.parentNode) {
            existingDropdown.parentNode.removeChild(existingDropdown);
        }

        // Create dropdown with project options
        const dropdown = document.createElement('div');
        dropdown.className = 'project-dropdown';
        dropdown.innerHTML = `
            <div class="project-dropdown__content">
                ${Object.values(PROJECT_DATA).map(project => `
                    <div class="project-dropdown__item" data-project-id="${project.id}">
                        <div class="project-dropdown__name">${project.name}</div>
                        <div class="project-dropdown__description">${project.description}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Position dropdown
        const loadButton = this.element.querySelector('[data-menu-item="load"]');
        const rect = loadButton.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.left}px`;
        dropdown.style.zIndex = '1000';

        // Add to DOM
        document.body.appendChild(dropdown);

        // Handle project selection
        dropdown.addEventListener('click', (e) => {
            const projectItem = e.target.closest('[data-project-id]');
            if (projectItem) {
                const projectId = projectItem.dataset.projectId;
                this.selectProject(projectId);
                this.removeDropdown(dropdown);
            }
        });

        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && !loadButton.contains(e.target)) {
                this.removeDropdown(dropdown);
                document.removeEventListener('click', closeDropdown);
            }
        };
        document.addEventListener('click', closeDropdown);
    }

    removeDropdown(dropdown) {
        // Safe removal with proper checks
        if (dropdown && dropdown.parentNode) {
            dropdown.parentNode.removeChild(dropdown);
        }
    }

    selectProject(projectId) {
        // Dispatch custom event for project selection
        const event = new CustomEvent('projectSelected', {
            detail: { projectId }
        });
        this.element.dispatchEvent(event);
    }
}

// ===== SIDEBAR COMPONENT =====
class SidebarComponent extends Component {
    init() {
        this.currentProject = null;
        this.isLooping = false;
        this.render();
        this.setupEventListeners();

        // Make handleDrop accessible globally for inline event handlers
        if (window.assemblyApp) {
            window.assemblyApp.sidebarComponent = this;
        }
    }

    render() {
        this.element.innerHTML = `
            <div class="file-info">
                File: <span class="file-info__name">my_project.ass</span>
            </div>
            <div class="transport-controls">
                ${this.renderTransportControls()}
            </div>
            <div class="divider"></div>
            <div class="clip-repository">
                <div class="clip-repository__header">Clips</div>
                ${this.renderClipRepository()}
            </div>
        `;
    }

    renderTransportControls() {
        const { transport } = PROJECT_CONFIG;

        return `
            <div class="transport-controls__row">
                ${transport.buttons.map(button => `
                    <button class="transport-button ${button.id === 'play' ? 'transport-button--play' : ''}"
                            title="${button.title}"
                            data-transport="${button.id}">
                        ${button.icon}
                    </button>
                `).join('')}
            </div>
            <div class="transport-controls__row">
                <label class="loop-toggle">
                    <input type="checkbox" class="loop-toggle__checkbox" ${this.isLooping ? 'checked' : ''}>
                    <span class="loop-toggle__label">${transport.loopToggle.label}</span>
                </label>
            </div>
        `;
    }

    renderClipRepository() {
        if (!this.currentProject) {
            return '<div class="clip-repository__empty">Select a project to view clips</div>';
        }

        // Group sidebar clips by category
        const clipsByCategory = this.groupSidebarClipsByCategory();

        return Object.entries(clipsByCategory).map(([categoryId, clips]) => {
            const category = getCategoryByType(categoryId);
            if (!category) return '';

            return `
                <div class="clip-category">
                    <div class="clip-category__header">
                        <span class="clip-category__icon">${category.icon}</span>
                        ${category.name}
                    </div>
                    <div class="clip-category__clips">
                        ${clips.map(clip => `
                            <div class="clip-item" 
                                 data-clip-id="${clip.id}"
                                 data-clip-type="${clip.type}"
                                 data-clip-duration="${clip.duration}"
                                 draggable="true">
                                <div class="clip-item__name">${clip.name}</div>
                                <div class="clip-item__duration">${this.formatDuration(clip.duration)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    groupSidebarClipsByCategory() {
        const clipsByCategory = {};

        // Group sidebar clips by type
        if (this.currentProject.sidebarClips) {
            this.currentProject.sidebarClips.forEach(clip => {
                if (!clipsByCategory[clip.type]) {
                    clipsByCategory[clip.type] = [];
                }
                clipsByCategory[clip.type].push(clip);
            });
        }

        return clipsByCategory;
    }

    formatDuration(duration) {
        // Format duration as beats (e.g., "4 beats", "0.5 beats")
        const roundedDuration = Math.round(duration * 10) / 10; // Round to 1 decimal place
        return `${roundedDuration} beat${roundedDuration === 1 ? '' : 's'}`;
    }

    setupEventListeners() {
        // Remove any existing listeners to prevent duplicates
        this.element.removeEventListener('click', this._boundClickHandler);
        this.element.removeEventListener('change', this._boundChangeHandler);
        this.element.removeEventListener('dragstart', this._boundDragStartHandler);
        this.element.removeEventListener('dragover', this._boundDragOverHandler);
        this.element.removeEventListener('drop', this._boundDropHandler);
        this.element.removeEventListener('dragend', this._boundDragEndHandler);

        // Bind handlers to this instance
        this._boundClickHandler = this.handleClick.bind(this);
        this._boundChangeHandler = this.handleChange.bind(this);
        this._boundDragStartHandler = this.handleDragStart.bind(this);
        this._boundDragOverHandler = this.handleDragOver.bind(this);
        this._boundDropHandler = this.handleDrop.bind(this);
        this._boundDragEndHandler = this.handleDragEnd.bind(this);

        // Add event listeners
        this.element.addEventListener('click', this._boundClickHandler);
        this.element.addEventListener('change', this._boundChangeHandler);
        this.element.addEventListener('dragstart', this._boundDragStartHandler);
        this.element.addEventListener('dragover', this._boundDragOverHandler);
        this.element.addEventListener('drop', this._boundDropHandler);
        this.element.addEventListener('dragend', this._boundDragEndHandler);
    }

    handleClick(e) {
        console.log('Sidebar click event:', e.target);

        // Handle checkbox clicks first (prevent them from being treated as transport buttons)
        if (e.target.classList.contains('loop-toggle__checkbox')) {
            console.log('Checkbox clicked directly');
            // Let the change event handle the action
            return;
        }

        const transportButton = e.target.closest('[data-transport]');
        if (transportButton) {
            const action = transportButton.dataset.transport;
            console.log('Transport button clicked:', action);
            this.handleTransportAction(action);
        }

        // Handle label clicks for loop toggle
        if (e.target.closest('.loop-toggle')) {
            console.log('Loop toggle area clicked');
            const checkbox = e.target.closest('.loop-toggle').querySelector('.loop-toggle__checkbox');
            if (checkbox) {
                console.log('Checkbox found, current state:', checkbox.checked);
                // Toggle the checkbox manually if it's a label click
                if (e.target.tagName === 'LABEL' || e.target.classList.contains('loop-toggle__label')) {
                    checkbox.checked = !checkbox.checked;
                    console.log('Checkbox toggled to:', checkbox.checked);
                    this.handleTransportAction('toggleLoop');
                }
            }
        }
    }

    handleChange(e) {
        console.log('Sidebar change event:', e.target);
        if (e.target.classList.contains('loop-toggle__checkbox')) {
            console.log('Checkbox change detected: toggleLoop checked:', e.target.checked);
            this.handleTransportAction('toggleLoop');
        }
    }

    handleDragStart(e) {
        const clipItem = e.target.closest('.clip-item');
        if (!clipItem) return;

        const clipId = clipItem.dataset.clipId;
        const clipType = clipItem.dataset.clipType;
        const clipDuration = parseFloat(clipItem.dataset.clipDuration);

        // Set global drag data
        window.globalDragData = {
            type: 'sidebar-clip',
            clipId,
            clipType,
            clipDuration,
            clipName: clipItem.querySelector('.clip-item__name')?.textContent || clipId
        };

        // Set drag image
        e.dataTransfer.setDragImage(clipItem, 10, 10);
        e.dataTransfer.effectAllowed = 'copy';

        console.log(`Sidebar drag start:`, window.globalDragData);
    }

    handleDragOver(e) {
        e.preventDefault();
        // Accept drags anywhere in the sidebar
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(e) {
        e.preventDefault();

        // Accept drops anywhere in the sidebar, not just on clip repository
        if (window.globalDragData && window.globalDragData.type === 'timeline-clip') {
            this.moveClipToSidebar(window.globalDragData);
        }
    }

    moveClipToSidebar(dragData) {
        // Find the track and remove the clip
        const track = this.currentProject.tracks.find(t => t.id === dragData.sourceTrackId);
        if (track) {
            const clipIndex = track.clips.findIndex(c => c.id === dragData.clipId);
            if (clipIndex !== -1) {
                const clip = track.clips.splice(clipIndex, 1)[0];

                // Create a new sidebar clip (without startTime)
                const sidebarClip = {
                    id: clip.id,
                    name: clip.name,
                    duration: clip.duration,
                    type: clip.type
                };

                // Add to sidebar clips
                this.currentProject.sidebarClips.push(sidebarClip);

                console.log('Moved clip to sidebar:', { clipId: clip.id, type: clip.type });

                // Re-render the sidebar
                this.render();

                // Dispatch event to update timeline
                const event = new CustomEvent('projectUpdated', {
                    detail: { project: this.currentProject }
                });
                this.element.dispatchEvent(event);
            }
        }
    }

    handleTransportAction(action) {
        console.log('Sidebar dispatching transport action:', action);
        // Dispatch custom event for transport actions
        const event = new CustomEvent('transportAction', {
            detail: { action }
        });
        this.element.dispatchEvent(event);
    }

    handleDragEnd(e) {
        window.globalDragData = null; // Clear global drag data
    }

    setProject(project) {
        this.currentProject = project;
        this.render();
    }

    setLoopState(isLooping) {
        this.isLooping = isLooping;
        const loopCheckbox = this.element.querySelector('.loop-toggle__checkbox');
        if (loopCheckbox && loopCheckbox.checked !== isLooping) {
            loopCheckbox.checked = isLooping;
        }
    }
}

// ===== TIMELINE COMPONENT =====
class TimelineComponent extends Component {
    init() {
        this.currentProject = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.element.innerHTML = `
            <div class="timeline-container">
                <div class="timeline-header">
                    <div class="timeline-header__time">${this.formatCurrentTime()}</div>
                    <div class="timeline-header__bpm">BPM: ${this.currentProject?.bpm || 120}</div>
                </div>
                <div class="tracks-area" id="tracks-area">
                    ${this.renderTimeRuler()}
                    ${this.renderTracks()}
                    ${this.renderAddTrackButton()}
                </div>
            </div>
        `;

        // Update button states after rendering
        if (this.currentProject) {
            this.updateTrackButtonStates();
        }
    }

    renderTimeRuler() {
        const beatsPerBar = 4;
        const bars = 4;
        const beats = [];

        for (let bar = 1; bar <= bars; bar++) {
            for (let beat = 1; beat <= beatsPerBar; beat++) {
                const isStrongBeat = beat === 1;
                beats.push({
                    label: `${bar}.${beat}`,
                    isStrong: isStrongBeat
                });
            }
        }

        return `
            <div class="time-ruler">
                <div class="time-ruler__left"></div>
                <div class="time-ruler__right">
                    <div class="time-ruler__grid">
                        ${beats.map(beat => `
                            <div class="time-ruler__beat">
                                <span class="time-ruler__beat-label ${beat.isStrong ? 'time-ruler__beat-label--strong' : ''}">
                                    ${beat.label}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderTracks() {
        if (!this.currentProject) {
            return '<div class="tracks-empty">Select a project to view tracks</div>';
        }

        return this.currentProject.tracks.map(track => this.renderTrack(track)).join('');
    }

    renderTrack(track) {
        const category = getCategoryByType(track.type);
        const trackColor = category ? category.color : '#6b7280';

        // Check if track management is allowed and this is a custom track
        const showRemoveButton = this.currentProject?.allowTrackManagement &&
            track.type === 'custom'; // Show remove for custom tracks only

        return `
            <div class="track" data-track-id="${track.id}">
                <div class="track__controls">
                    <button class="track__button" title="Solo" data-track-action="solo" data-track-id="${track.id}">
                        🎧
                    </button>
                    <button class="track__button" title="Mute" data-track-action="mute" data-track-id="${track.id}">
                        🔇
                    </button>
                    ${showRemoveButton ? `
                        <button class="track__button track__button--remove" title="Remove Track" data-track-action="remove" data-track-id="${track.id}">
                            🗑️
                        </button>
                    ` : ''}
                </div>
                <div class="track__name" data-track-id="${track.id}">${track.name}</div>
                <div class="track__clips-area" data-track-id="${track.id}">
                    <div class="track__playhead"></div>
                    <div class="track__clips">
                        ${track.clips.map(clip => this.renderClip(clip, track)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderClip(clip, track) {
        const pixelsPerBeat = this.getPixelsPerBeat();
        const width = clip.duration * pixelsPerBeat;
        const left = clip.startTime * pixelsPerBeat;

        return `
            <div class="clip clip--dark"
                 data-clip-id="${clip.id}"
                 data-track-id="${track.id}"
                 data-clip-type="${clip.type}"
                 data-clip-duration="${clip.duration}"
                 data-clip-start-time="${clip.startTime}"
                 style="width: ${width}px; left: ${left}px;"
                 draggable="true">
                <div class="clip__resize-handle clip__resize-handle--left"></div>
                <div class="clip__resize-handle clip__resize-handle--right"></div>
                <div class="clip__content">
                    <div class="clip__name">${clip.name}</div>
                    <div class="clip__duration">${this.formatDuration(clip.duration)}</div>
                </div>
            </div>
        `;
    }

    renderAddTrackButton() {
        // Only show add track button if project allows track management
        if (!this.currentProject?.allowTrackManagement) {
            return '';
        }

        return `
            <div class="add-track-button">
                <button class="add-track-button__button" data-action="add-track">
                    + Add Track
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        // Track actions (mute, solo, rename)
        this.element.addEventListener('click', (e) => {
            const trackAction = e.target.closest('[data-track-action]');
            if (trackAction) {
                const action = trackAction.dataset.trackAction;
                const trackId = trackAction.dataset.trackId;
                this.handleTrackAction(action, trackId);
            }

            // Track name editing
            const trackName = e.target.closest('.track__name');
            if (trackName && !trackName.dataset.editing) {
                this.startTrackNameEdit(trackName);
            }

            // Add track button
            if (e.target.closest('.add-track-button__button')) {
                this.handleAddTrack();
            }
        });

        // Track name editing
        this.element.addEventListener('blur', (e) => {
            const trackName = e.target.closest('.track__name');
            if (trackName && trackName.dataset.editing) {
                this.finishTrackNameEdit(trackName);
            }
        }, true);

        this.element.addEventListener('keydown', (e) => {
            const trackName = e.target.closest('.track__name');
            if (trackName && trackName.dataset.editing) {
                if (e.key === 'Enter') {
                    this.finishTrackNameEdit(trackName);
                } else if (e.key === 'Escape') {
                    this.cancelTrackNameEdit(trackName);
                }
            }
        });

        // Setup drag and drop
        this.setupDragAndDrop();

        // Setup clip resizing
        this.setupClipResizing();
    }

    setupClipResizing() {
        let resizingClip = null;
        let resizeHandle = null;
        let startX = 0;
        let startWidth = 0;
        let startTime = 0;
        let originalDuration = 0;

        // Mouse down on resize handle
        this.element.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.clip__resize-handle');
            if (!handle) return;

            e.preventDefault();
            e.stopPropagation();

            const clip = handle.closest('.clip');
            if (!clip) return;

            resizingClip = clip;
            resizeHandle = handle;
            startX = e.clientX;
            startWidth = clip.offsetWidth;
            startTime = parseFloat(clip.dataset.clipStartTime);
            originalDuration = parseFloat(clip.dataset.clipDuration);

            // Add resizing class
            handle.classList.add('clip__resize-handle--resizing');
            clip.classList.add('clip--resizing');

            // Add global mouse event listeners
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        const handleMouseMove = (e) => {
            if (!resizingClip || !resizeHandle) return;

            const deltaX = e.clientX - startX;
            const trackElement = resizingClip.closest('.track');
            const trackId = trackElement.dataset.trackId;

            // Calculate new width and duration
            let newWidth = startWidth;
            let newDuration = originalDuration;
            let newStartTime = startTime;

            if (resizeHandle.classList.contains('clip__resize-handle--left')) {
                // Resizing from left edge
                newWidth = Math.max(20, startWidth - deltaX); // Minimum 20px width
                const widthChange = startWidth - newWidth;
                const timeChange = widthChange / this.getPixelsPerBeat();
                newStartTime = Math.max(0, startTime + timeChange);
                newDuration = Math.max(0.1, originalDuration - timeChange);
            } else {
                // Resizing from right edge
                newWidth = Math.max(20, startWidth + deltaX); // Minimum 20px width
                const widthChange = newWidth - startWidth;
                const timeChange = widthChange / this.getPixelsPerBeat();
                newDuration = Math.max(0.1, originalDuration + timeChange);
            }

            // Check for overlaps
            if (this.wouldOverlap(trackId, resizingClip.dataset.clipId, newStartTime, newDuration)) {
                return; // Don't allow resize if it would create overlap
            }

            // Update clip appearance
            resizingClip.style.width = `${newWidth}px`;
            resizingClip.style.left = `${newStartTime * this.getPixelsPerBeat()}px`;

            // Update data attributes
            resizingClip.dataset.clipStartTime = newStartTime.toString();
            resizingClip.dataset.clipDuration = newDuration.toString();

            // Update clip content
            const durationElement = resizingClip.querySelector('.clip__duration');
            if (durationElement) {
                durationElement.textContent = `${newDuration.toFixed(1)} beats`;
            }
        };

        const handleMouseUp = () => {
            if (!resizingClip || !resizeHandle) return;

            // Remove resizing classes
            resizeHandle.classList.remove('clip__resize-handle--resizing');
            resizingClip.classList.remove('clip--resizing');

            // Update the actual clip data
            const trackId = resizingClip.closest('.track').dataset.trackId;
            const clipId = resizingClip.dataset.clipId;
            const newStartTime = parseFloat(resizingClip.dataset.clipStartTime);
            const newDuration = parseFloat(resizingClip.dataset.clipDuration);

            // Dispatch event to update app state
            const event = new CustomEvent('clipResized', {
                detail: {
                    trackId,
                    clipId,
                    newStartTime,
                    newDuration
                }
            });
            this.element.dispatchEvent(event);

            // Clean up
            resizingClip = null;
            resizeHandle = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    wouldOverlap(trackId, excludeClipId, startTime, duration) {
        const endTime = startTime + duration;
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) return false;

        return track.clips.some(clip => {
            if (clip.id === excludeClipId) return false;
            const clipEnd = clip.startTime + clip.duration;
            return (startTime < clipEnd && endTime > clip.startTime);
        });
    }

    getPixelsPerBeat() {
        return PROJECT_CONFIG.layout.gridBeatWidth;
    }

    setupDragAndDrop() {
        // Drag start for timeline clips
        this.element.addEventListener('dragstart', (e) => {
            const clip = e.target.closest('.clip');
            if (!clip) return;

            const trackId = clip.dataset.trackId;
            const clipId = clip.dataset.clipId;
            const clipType = clip.dataset.clipType;
            const clipDuration = parseFloat(clip.dataset.clipDuration);
            const clipStartTime = parseFloat(clip.dataset.clipStartTime);

            // Set global drag data
            window.globalDragData = {
                type: 'timeline-clip',
                clipId,
                clipType,
                clipDuration,
                clipStartTime,
                sourceTrackId: trackId
            };

            // Set drag image
            e.dataTransfer.setDragImage(clip, 10, 10);
            e.dataTransfer.effectAllowed = 'move';

            console.log(`Timeline drag start: ${clipId} from track ${trackId}`);
        });

        // Drag end cleanup
        this.element.addEventListener('dragend', (e) => {
            const clip = e.target.closest('.clip');
            if (clip) {
                // Clear global drag data
                window.globalDragData = null;

                // Hide any drop previews
                this.cleanupDropPreviews();
            }
        });
    }

    handleClipDrop(dragData, targetTrackId, dropPosition) {
        if (dragData.type === 'sidebar-clip') {
            this.addClipToTrack(dragData, targetTrackId, dropPosition.startTime);
        } else if (dragData.type === 'timeline-clip') {
            this.moveClipInTimeline(dragData, targetTrackId, dropPosition.startTime);
        }
    }

    addClipToTrack(clipData, trackId, startTime) {
        // Find the track
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) {
            console.error(`Track not found: ${trackId}`);
            return;
        }

        // Check for overlaps
        if (this.wouldOverlap(trackId, null, startTime, clipData.clipDuration)) {
            console.warn(`Cannot add clip: would overlap with existing clips`);
            return;
        }

        // Create new clip object
        const newClip = {
            id: clipData.clipId,
            name: clipData.clipName || clipData.clipId,
            duration: clipData.clipDuration,
            startTime: startTime,
            type: clipData.clipType
        };

        // Add to track
        track.clips.push(newClip);

        // Dispatch event
        const event = new CustomEvent('clipAdded', {
            detail: { trackId, clip: newClip }
        });
        this.element.dispatchEvent(event);

        // Re-render timeline
        this.render();

        console.log(`Added clip to track:`, { trackId, clipId: clipData.clipId, startTime });
    }

    moveClipInTimeline(dragData, targetTrackId, newStartTime) {
        const { clipId, sourceTrackId, clipDuration } = dragData;

        // Find source and target tracks
        const sourceTrack = this.currentProject.tracks.find(t => t.id === sourceTrackId);
        const targetTrack = this.currentProject.tracks.find(t => t.id === targetTrackId);

        if (!sourceTrack || !targetTrack) {
            console.error(`Track not found: source=${sourceTrackId}, target=${targetTrackId}`);
            return;
        }

        // Find the clip
        const clipIndex = sourceTrack.clips.findIndex(c => c.id === clipId);
        if (clipIndex === -1) {
            console.error(`Clip not found: ${clipId}`);
            return;
        }

        const clip = sourceTrack.clips[clipIndex];

        // Check for overlaps in target track (excluding the moving clip)
        if (this.wouldOverlap(targetTrackId, clipId, newStartTime, clipDuration)) {
            console.warn(`Cannot move clip: would overlap with existing clips`);
            return;
        }

        // Remove from source track
        sourceTrack.clips.splice(clipIndex, 1);

        // Update clip start time
        clip.startTime = newStartTime;

        // Add to target track
        targetTrack.clips.push(clip);

        // Dispatch event
        const event = new CustomEvent('clipMoved', {
            detail: {
                clipId,
                sourceTrackId,
                targetTrackId,
                newStartTime
            }
        });
        this.element.dispatchEvent(event);

        // Re-render timeline
        this.render();

        console.log(`Moved clip: ${clipId} from ${sourceTrackId} to ${targetTrackId} at ${newStartTime}`);
    }

    handleTrackAction(action, trackId) {
        // Handle remove action locally since it's UI-specific
        if (action === 'remove') {
            this.handleRemoveTrack(trackId);
            return;
        }

        // Delegate other actions to main app
        const event = new CustomEvent('trackAction', {
            detail: { action, trackId }
        });
        this.element.dispatchEvent(event);
    }

    updateTrackButtonStates() {
        this.currentProject.tracks.forEach(track => {
            const trackElement = this.element.querySelector(`[data-track-id="${track.id}"]`);
            if (!trackElement) return;

            const soloButton = trackElement.querySelector('[data-track-action="solo"]');
            const muteButton = trackElement.querySelector('[data-track-action="mute"]');

            if (soloButton) {
                soloButton.classList.toggle('track__button--active', track.soloed);
            }
            if (muteButton) {
                muteButton.classList.toggle('track__button--active', track.muted);
            }
        });
    }

    handleTrackNameChange(trackId, newName) {
        // Validate name
        if (!newName || newName.trim().length === 0) {
            console.warn('Track name cannot be empty');
            return;
        }

        // Update track name in project data
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (track) {
            track.name = newName.trim();
            console.log(`Track name changed: ${trackId} -> ${newName}`);

            // Dispatch event
            const event = new CustomEvent('trackNameChanged', {
                detail: { trackId, newName: newName.trim() }
            });
            this.element.dispatchEvent(event);
        }
    }

    handleAddTrack() {
        if (!this.currentProject?.allowTrackManagement) {
            console.warn('Track management not allowed for this project');
            return;
        }

        // Generate new track ID
        const trackCount = this.currentProject.tracks.length;
        const newTrackId = `track-${trackCount + 1}`;
        const newTrackName = `Track ${trackCount + 1}`;

        // Create new track object
        const newTrack = {
            id: newTrackId,
            name: newTrackName,
            type: 'custom',
            clips: [],
            muted: false,
            soloed: false
        };

        // Add to project
        this.currentProject.tracks.push(newTrack);

        // Dispatch event to update app state
        const event = new CustomEvent('trackAdded', {
            detail: { track: newTrack }
        });
        this.element.dispatchEvent(event);

        // Re-render timeline
        this.render();
        console.log(`Added new track: ${newTrackName}`);
    }

    handleRemoveTrack(trackId) {
        if (!this.currentProject?.allowTrackManagement) {
            console.warn('Track management not allowed for this project');
            return;
        }

        // Find track index
        const trackIndex = this.currentProject.tracks.findIndex(t => t.id === trackId);
        if (trackIndex === -1) {
            console.warn(`Track not found: ${trackId}`);
            return;
        }

        // Remove track
        const removedTrack = this.currentProject.tracks.splice(trackIndex, 1)[0];

        // Dispatch event to update app state
        const event = new CustomEvent('trackRemoved', {
            detail: { trackId, track: removedTrack }
        });
        this.element.dispatchEvent(event);

        // Re-render timeline
        this.render();
        console.log(`Removed track: ${removedTrack.name}`);
    }

    formatCurrentTime() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatDuration(duration) {
        // Format duration as beats (e.g., "4 beats", "0.5 beats")
        const roundedDuration = Math.round(duration * 10) / 10; // Round to 1 decimal place
        return `${roundedDuration} beat${roundedDuration === 1 ? '' : 's'}`;
    }

    setProject(project) {
        this.currentProject = project;
        this.render();
    }

    setCurrentTime(time) {
        this.currentTime = time;

        // Update time display
        const timeDisplay = this.element.querySelector('.timeline-header__time');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatCurrentTime();
        }

        // Update playhead position
        this.updatePlayheadPosition(time);
    }

    updatePlayheadPosition(time) {
        const playheads = this.element.querySelectorAll('.track__playhead');
        const beatWidth = PROJECT_CONFIG.layout.gridBeatWidth;
        const leftPosition = time * beatWidth;

        playheads.forEach(playhead => {
            playhead.style.left = `${leftPosition}px`;
        });
    }

    setPlaying(playing) {
        this.isPlaying = playing;

        // Add visual feedback for playing state
        const timelineContainer = this.element.querySelector('.timeline-container');
        if (timelineContainer) {
            if (playing) {
                timelineContainer.classList.add('timeline-container--playing');
            } else {
                timelineContainer.classList.remove('timeline-container--playing');
            }
        }

        // Update playhead visibility
        const playheads = this.element.querySelectorAll('.track__playhead');
        playheads.forEach(playhead => {
            if (playing) {
                playhead.style.opacity = '0.8';
            } else {
                playhead.style.opacity = '0.4';
            }
        });
    }

    startTrackNameEdit(trackNameElement) {
        const trackId = trackNameElement.dataset.trackId;
        const currentName = trackNameElement.textContent.trim();

        // Store original name for cancellation
        trackNameElement.dataset.originalName = currentName;
        trackNameElement.dataset.editing = 'true';

        // Make editable
        trackNameElement.contentEditable = true;
        trackNameElement.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(trackNameElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    finishTrackNameEdit(trackNameElement) {
        const trackId = trackNameElement.dataset.trackId;
        const newName = trackNameElement.textContent.trim();

        // Validate name
        if (!newName || newName.length === 0) {
            this.cancelTrackNameEdit(trackNameElement);
            return;
        }

        // Update the track name
        this.handleTrackNameChange(trackId, newName);

        // Clean up
        trackNameElement.contentEditable = false;
        delete trackNameElement.dataset.editing;
        delete trackNameElement.dataset.originalName;
    }

    cancelTrackNameEdit(trackNameElement) {
        const originalName = trackNameElement.dataset.originalName;
        trackNameElement.textContent = originalName;
        trackNameElement.contentEditable = false;
        delete trackNameElement.dataset.editing;
        delete trackNameElement.dataset.originalName;
    }

    calculateDropPosition(e, trackElement) {
        // Get the clips area element, not the entire track
        const clipsArea = trackElement.querySelector('.track__clips-area');
        if (!clipsArea) {
            return { startTime: 0, endTime: 0, isValid: false };
        }

        const rect = clipsArea.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const trackId = trackElement.dataset.trackId;

        // Convert pixels to beats with snapping
        const beatsPerPixel = 1 / this.getPixelsPerBeat();
        let startTime = x * beatsPerPixel;

        // Snap to nearest beat boundary
        startTime = Math.round(startTime * 4) / 4; // Snap to quarter beats

        // Ensure non-negative
        startTime = Math.max(0, startTime);

        // Get drag data
        const dragData = window.globalDragData;
        if (!dragData) return { startTime: 0, endTime: 0, isValid: false };

        const duration = dragData.clipDuration || 1;
        const endTime = startTime + duration;

        // Check for overlaps
        const wouldOverlap = this.wouldOverlap(trackId, null, startTime, duration);

        return {
            startTime,
            endTime,
            isValid: !wouldOverlap,
            x: startTime * this.getPixelsPerBeat(),
            width: duration * this.getPixelsPerBeat()
        };
    }

    showDropPreview(trackElement, dropPosition) {
        // Remove existing preview
        this.hideDropPreview(trackElement);

        if (dropPosition.isValid) {
            const preview = document.createElement('div');
            preview.className = 'clip-drop-preview';
            preview.style.cssText = `
                position: absolute;
                left: ${dropPosition.x}px;
                width: ${dropPosition.width}px;
                height: 100%;
                background-color: rgba(56, 189, 248, 0.3);
                border: 2px dashed var(--color-accent-primary);
                pointer-events: none;
                z-index: 10;
            `;

            const clipsArea = trackElement.querySelector('.track__clips-area');
            if (clipsArea) {
                clipsArea.appendChild(preview);
            }
        }
    }

    hideDropPreview(trackElement) {
        const existingPreview = trackElement.querySelector('.clip-drop-preview');
        if (existingPreview) {
            existingPreview.remove();
        }
    }

    cleanupDropPreviews() {
        const allPreviews = this.element.querySelectorAll('.clip-drop-preview');
        allPreviews.forEach(preview => preview.remove());
    }

    snapToGrid(time) {
        // Snap to nearest quarter beat
        return Math.round(time * 4) / 4;
    }
}

// ===== VU METER COMPONENT =====
class VUMeterComponent extends Component {
    init() {
        this.level = 0;
        this.animationInterval = null;
        this.isAnimating = false;
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="vu-meter" id="vu-meter">
                <div class="vu-meter__level" style="height: ${this.level}%"></div>
            </div>
            <div class="vu-meter__label">L&nbsp;&nbsp;R</div>
        `;
    }

    startAnimation() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        console.log('VU meter animation started');

        // Start the animation interval
        this.animationInterval = setInterval(() => {
            // Only animate when playing - the level will be set externally
            if (this.level === 0) {
                // Fallback animation when no external level is set
                this.level = Math.random() * 30; // Low level when not playing
            }
            this.render();
        }, 50); // Faster update rate for smoother animation
    }

    stopAnimation() {
        if (!this.isAnimating) return;

        this.isAnimating = false;
        this.level = 0;

        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }

        this.render();
        console.log('VU meter animation stopped');
    }

    setLevel(level) {
        this.level = Math.max(0, Math.min(100, level));
        // Don't render here - let the animation interval handle it
    }

    destroy() {
        this.stopAnimation();
        super.destroy();
    }
}

// ===== UTILITY FUNCTIONS =====
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Component Error: ${message}`);
    }
}

// ===== EXPORTS =====
export {
    Component,
    HeaderComponent,
    SidebarComponent,
    TimelineComponent,
    VUMeterComponent
}; 