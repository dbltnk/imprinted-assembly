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
        return `${duration} beat${duration === 1 ? '' : 's'}`;
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
        const clipItem = e.target.closest('[data-clip-id]');
        if (clipItem && !clipItem.dataset.trackId) { // Only sidebar clips
            const clipId = clipItem.dataset.clipId;
            const clipType = clipItem.dataset.clipType;
            const clipDuration = parseFloat(clipItem.dataset.clipDuration);

            const dragData = {
                type: 'sidebar-clip',
                clipId,
                clipType,
                clipDuration
            };

            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'copy';

            // Store global drag data for preview calculation
            window.globalDragData = dragData;

            console.log('Sidebar drag start:', { clipId, clipType, clipDuration });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        // Accept drags anywhere in the sidebar
        e.dataTransfer.dropEffect = 'copy';
    }

    handleDrop(e) {
        e.preventDefault();

        // Accept drops anywhere in the sidebar, not just on clip repository
        try {
            const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
            if (dragData.type === 'timeline-clip') {
                this.moveClipToSidebar(dragData);
            }
        } catch (error) {
            console.error('Error parsing drag data:', error);
        }
    }

    moveClipToSidebar(dragData) {
        // Find the track and remove the clip
        const track = this.currentProject.tracks.find(t => t.id === dragData.trackId);
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

        return `
            <div class="track" data-track-id="${track.id}">
                <div class="track__controls">
                    ${PROJECT_CONFIG.trackControls.buttons.map(button => `
                        <button class="track__button" 
                                title="${button.title}"
                                data-track-action="${button.id}"
                                data-track-id="${track.id}">
                            ${button.icon}
                        </button>
                    `).join('')}
                    <span class="track__name" 
                          contenteditable="true"
                          data-track-id="${track.id}">
                        ${track.name}
                    </span>
                </div>
                <div class="track__clips-area" 
                     data-track-id="${track.id}"
                     ondragover="event.preventDefault(); if (window.assemblyApp && window.assemblyApp.timelineComponent) { const dropPosition = window.assemblyApp.timelineComponent.calculateDropPosition(event, event.target.closest('.track')); if (dropPosition.isValid) { event.dataTransfer.dropEffect='copy'; window.assemblyApp.timelineComponent.showDropPreview(event.target.closest('.track'), dropPosition); } else { event.dataTransfer.dropEffect='none'; window.assemblyApp.timelineComponent.hideDropPreview(event.target.closest('.track')); } }"
                     ondragleave="if (window.assemblyApp && window.assemblyApp.timelineComponent) { window.assemblyApp.timelineComponent.hideDropPreview(event.target.closest('.track')); }"
                     ondrop="window.handleTrackDrop(event, '${track.id}')">
                    <div class="track__playhead"></div>
                    <div class="track__clips">
                        ${track.clips.map(clip => this.renderClip(clip, track)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderClip(clip, track) {
        const category = getCategoryByType(track.type);
        const width = clip.duration * PROJECT_CONFIG.layout.gridBeatWidth;
        const left = clip.startTime * PROJECT_CONFIG.layout.gridBeatWidth;

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
        // Track actions
        this.element.addEventListener('click', (e) => {
            const trackButton = e.target.closest('[data-track-action]');
            if (trackButton) {
                const action = trackButton.dataset.trackAction;
                const trackId = trackButton.dataset.trackId;
                this.handleTrackAction(action, trackId);
            }
        });

        // Track name editing
        this.element.addEventListener('blur', (e) => {
            if (e.target.classList.contains('track__name')) {
                const trackId = e.target.dataset.trackId;
                const newName = e.target.textContent.trim();
                this.handleTrackNameChange(trackId, newName);
            }
        }, true);

        // Add track button
        this.element.addEventListener('click', (e) => {
            if (e.target.closest('.add-track-button__button')) {
                this.handleAddTrack();
            }
        });

        // Drag and drop for clips
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        // Drag start from timeline clips
        this.element.addEventListener('dragstart', (e) => {
            const clipElement = e.target.closest('[data-clip-id]');
            if (clipElement && clipElement.dataset.trackId) { // Timeline clip (has trackId)
                const clipId = clipElement.dataset.clipId;
                const trackId = clipElement.dataset.trackId;
                const clipType = clipElement.dataset.clipType;
                const clipDuration = parseFloat(clipElement.dataset.clipDuration);
                const clipStartTime = parseFloat(clipElement.dataset.clipStartTime);

                const dragData = {
                    type: 'timeline-clip',
                    clipId,
                    trackId,
                    clipType,
                    clipDuration,
                    clipStartTime
                };

                e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = 'move';

                // Store global drag data for preview calculation
                window.globalDragData = dragData;

                console.log('Drag start from timeline:', { clipId, trackId, clipType, clipDuration });
            }
        });

        // Drag start from sidebar clips (this should be handled by sidebar component)
        // We don't need to handle sidebar drags here since they're handled in the sidebar component

        // Drag over tracks
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            const trackElement = e.target.closest('.track');
            if (trackElement) {
                const trackId = trackElement.dataset.trackId;
                const dropPosition = this.calculateDropPosition(e, trackElement);

                if (dropPosition.isValid) {
                    e.dataTransfer.dropEffect = 'copy';
                    this.showDropPreview(trackElement, dropPosition);
                } else {
                    e.dataTransfer.dropEffect = 'none';
                    this.hideDropPreview(trackElement);
                }
            }
        });

        // Drag leave
        this.element.addEventListener('dragleave', (e) => {
            const trackElement = e.target.closest('.track');
            if (trackElement) {
                this.hideDropPreview(trackElement);
            }
        });

        // Drop on tracks
        // REMOVED: Using global drop handler with inline ondrop attributes instead
        // this.element.addEventListener('drop', (e) => { ... });

        // Clear global drag data when drag ends
        this.element.addEventListener('dragend', (e) => {
            console.log('Drag end event triggered');
            window.globalDragData = null;
        });
    }

    calculateDropPosition(e, trackElement) {
        const trackClipsArea = trackElement.querySelector('.track__clips-area');
        const rect = trackClipsArea.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Snap to beat grid
        const beatWidth = PROJECT_CONFIG.layout.gridBeatWidth;
        const startTime = Math.round(x / beatWidth);

        // Get clip duration from global drag data
        let clipDuration = 1; // Default
        if (window.globalDragData) {
            clipDuration = window.globalDragData.clipDuration || 1;
        }

        const endTime = startTime + clipDuration;

        // Check for collisions with existing clips (excluding the dragged clip)
        const existingClips = trackElement.querySelectorAll('[data-clip-id]');
        let hasCollision = false;

        existingClips.forEach(clipElement => {
            // Skip the clip being dragged
            if (window.globalDragData &&
                window.globalDragData.type === 'timeline-clip' &&
                clipElement.dataset.clipId === window.globalDragData.clipId) {
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

        return {
            startTime,
            endTime,
            isValid: !hasCollision && startTime >= 0,
            x: startTime * beatWidth,
            width: clipDuration * beatWidth
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

    handleClipDrop(dragData, targetTrackId, dropPosition) {
        console.log('Handling clip drop:', { dragData, targetTrackId, dropPosition });

        if (!dropPosition.isValid) {
            console.log('Invalid drop position');
            return;
        }

        if (dragData.type === 'sidebar-clip') {
            // Adding new clip from sidebar
            this.addClipToTrack(dragData, targetTrackId, dropPosition.startTime);
        } else if (dragData.type === 'timeline-clip') {
            // Moving existing clip
            this.moveClipInTimeline(dragData, targetTrackId, dropPosition.startTime);
        }
    }

    addClipToTrack(clipData, trackId, startTime) {
        // Find the clip in sidebar clips
        const sidebarClipIndex = this.currentProject.sidebarClips.findIndex(c => c.id === clipData.clipId);
        if (sidebarClipIndex === -1) {
            console.error('Clip not found in sidebar:', clipData.clipId);
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

            // Re-render the timeline
            this.render();

            // Dispatch event to update sidebar
            const event = new CustomEvent('projectUpdated', {
                detail: { project: this.currentProject }
            });
            this.element.dispatchEvent(event);
        }
    }

    moveClipInTimeline(clipData, targetTrackId, newStartTime) {
        // Remove from original track
        const sourceTrack = this.currentProject.tracks.find(t => t.id === clipData.trackId);
        if (sourceTrack) {
            const clipIndex = sourceTrack.clips.findIndex(c => c.id === clipData.clipId);
            if (clipIndex !== -1) {
                const clip = sourceTrack.clips.splice(clipIndex, 1)[0];

                // Update clip start time
                clip.startTime = newStartTime;

                // Add to target track
                const targetTrack = this.currentProject.tracks.find(t => t.id === targetTrackId);
                if (targetTrack) {
                    targetTrack.clips.push(clip);
                    console.log('Moved clip:', {
                        fromTrack: clipData.trackId,
                        toTrack: targetTrackId,
                        clipId: clip.id,
                        newStartTime
                    });

                    // Re-render the timeline
                    this.render();

                    // Dispatch event to update sidebar
                    const event = new CustomEvent('projectUpdated', {
                        detail: { project: this.currentProject }
                    });
                    this.element.dispatchEvent(event);
                }
            }
        }
    }

    handleTrackAction(action, trackId) {
        const event = new CustomEvent('trackAction', {
            detail: { action, trackId }
        });
        this.element.dispatchEvent(event);
    }

    handleTrackNameChange(trackId, newName) {
        const event = new CustomEvent('trackNameChange', {
            detail: { trackId, newName }
        });
        this.element.dispatchEvent(event);
    }

    handleAddTrack() {
        const event = new CustomEvent('addTrack');
        this.element.dispatchEvent(event);
    }

    formatCurrentTime() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatDuration(duration) {
        // Format duration as beats (e.g., "4 beats", "0.5 beats")
        return `${duration} beat${duration === 1 ? '' : 's'}`;
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