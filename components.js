/**
 * Assembly Audio Editor - UI Components
 * Modular component system for building the audio editor interface
 */

import { PROJECT_CONFIG, PROJECT_DATA, CLIP_CATEGORIES, getCategoryByType, calculateTimelineLength } from './config.js';
import { assert, formatDuration, formatTimeDisplay } from './utils.js';

// ===== GLOBAL VARIABLES =====

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
    }

    render() {
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
        const activeClass = item.hasDropdown || item.id === 'createSong' ? 'header__nav-button--active' : '';

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
        } else if (itemId === 'createSong') {
            this.selectProject('song');
        }
        // Other menu items are disabled for now
    }

    handleWindowControlClick(controlId) {
        console.log(`Window control clicked: ${controlId}`);
    }

    showProjectDropdown() {
        // Remove any existing dropdown first
        const existingDropdown = document.querySelector('.project-dropdown');
        if (existingDropdown && existingDropdown.parentNode) {
            existingDropdown.parentNode.removeChild(existingDropdown);
        }

        // Create dropdown with project options (excluding 'song')
        const dropdown = document.createElement('div');
        dropdown.className = 'project-dropdown';
        dropdown.innerHTML = `
            <div class="project-dropdown__content">
                ${Object.values(PROJECT_DATA)
                .filter(project => project.id !== 'song')
                .map(project => `
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
                <div class="file-info__row">
                    <span class="file-info__label">${PROJECT_CONFIG.content.fileInfo.fileLabel}</span>
                    <span class="file-info__value">${this.getFileName()}</span>
                </div>
                <div class="file-info__row">
                    <span class="file-info__label">${PROJECT_CONFIG.content.fileInfo.bpmLabel}</span>
                    <span class="file-info__value">${this.getBPM()}</span>
                </div>
                <div class="file-info__row">
                    <span class="file-info__label">Time Sig:</span>
                    <span class="file-info__value">${this.getTimeSignature()}</span>
                </div>
            </div>
            <div class="file-info-divider"></div>
            <div class="time-display">
                ${this.formatTimeDisplay()}
            </div>
            <div class="transport-controls">
                ${this.renderTransportControls()}
            </div>
            <div class="file-info-divider"></div>
            <div class="clip-repository">
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
            return `<div class="clip-repository__empty">${PROJECT_CONFIG.content.clipRepository.emptyMessage}</div>`;
        }

        // Get used clip IDs from timeline
        const usedClipIds = this.getUsedClipIds();

        // Group sidebar clips by category
        const clipsByCategory = this.groupSidebarClipsByCategory();

        return Object.entries(clipsByCategory).map(([categoryId, clips]) => {
            const category = getCategoryByType(categoryId);
            if (!category) return '';

            return `
                <div class="clip-category">
                    <div class="clip-category__header folder-label">
                        <span class="folder-caret">&#9654;</span>
                        <span class="folder-name">${category.name}</span>
                    </div>
                    <div class="clip-category__clips">
                        ${clips.map(clip => {
                const isUsed = usedClipIds.includes(clip.id);
                const usedCount = this.getClipUsageCount(clip.id);
                return `
                                <div class="clip-item ${isUsed ? 'clip-item--used' : ''}" 
                                     data-clip-id="${clip.id}"
                                     data-clip-type="${clip.type}"
                                     data-clip-duration="${clip.duration}"
                                     draggable="true">
                                    <div class="clip-item__name">
                                        ${clip.name}
                                        ${usedCount > 0 ? `<span class="clip-item__usage-count">(${usedCount})</span>` : ''}
                                    </div>
                                    <div class="clip-item__beats">
                                        ${this.renderBeatBars(clip.duration)}
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderBeatBars(duration) {
        const beatCount = Math.ceil(duration);
        const bars = [];

        for (let i = 0; i < beatCount; i++) {
            const isActive = i < duration;
            const isPartial = i === Math.floor(duration) && duration % 1 !== 0;
            const partialHeight = duration % 1;

            bars.push(`
                <div class="beat-bar ${isActive ? 'beat-bar--active' : 'beat-bar--inactive'} ${isPartial ? 'beat-bar--partial' : ''}"
                     style="${isPartial ? `height: ${partialHeight * 100}%` : ''}">
                </div>
            `);
        }

        return bars.join('');
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

    formatTimeDisplay() {
        return formatTimeDisplay(this.currentTime || 0, this.totalDuration || this.calculateDurationInSeconds());
    }

    setupEventListeners() {
        this.removeExistingListeners();
        this.bindHandlers();
        this.addEventListeners();
    }

    removeExistingListeners() {
        const events = ['click', 'change', 'dragstart', 'dragover', 'drop', 'dragend'];
        events.forEach(event => {
            this.element.removeEventListener(event, this[`_bound${event.charAt(0).toUpperCase() + event.slice(1)}Handler`]);
        });
    }

    bindHandlers() {
        this._boundClickHandler = this.handleClick.bind(this);
        this._boundChangeHandler = this.handleChange.bind(this);
        this._boundDragStartHandler = this.handleDragStart.bind(this);
        this._boundDragOverHandler = this.handleDragOver.bind(this);
        this._boundDropHandler = this.handleDrop.bind(this);
        this._boundDragEndHandler = this.handleDragEnd.bind(this);
    }

    addEventListeners() {
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
        // Sidebar is treated as generic empty space - no special handling needed
        // The global drop handler will handle timeline clip removal
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

        // Calculate timeline length based on project data
        if (project) {
            this.timelineLength = calculateTimelineLength(project);
            console.log('Timeline length calculated:', this.timelineLength);

            // Calculate duration in seconds from beats and BPM
            this.totalDuration = this.calculateDurationInSeconds();
        }

        this.render();

        // Update clip playing states after rendering
        if (this.currentTime !== undefined) {
            this.updateClipPlayingStates(this.currentTime);
        }
    }

    refreshClipRepository() {
        // Re-render only the clip repository section
        const clipRepository = this.element.querySelector('.clip-repository');
        if (clipRepository) {
            clipRepository.innerHTML = this.renderClipRepository();
        }
    }

    calculateDurationInSeconds() {
        if (!this.currentProject || !this.timelineLength) return 16;

        // Convert beats to seconds: (beats / BPM) * 60
        const beats = this.timelineLength.beats;
        const bpm = this.currentProject.bpm;
        return (beats / bpm) * 60;
    }

    formatTimeDisplay() {
        return formatTimeDisplay(this.currentTime || 0, this.totalDuration || this.calculateDurationInSeconds());
    }

    setLoopState(isLooping) {
        this.isLooping = isLooping;
        const loopCheckbox = this.element.querySelector('.loop-toggle__checkbox');
        if (loopCheckbox && loopCheckbox.checked !== isLooping) {
            loopCheckbox.checked = isLooping;
        }
    }

    setCurrentTime(time) {
        this.currentTime = time;
        this.updateTimeDisplay();
    }

    setTotalDuration(duration) {
        this.totalDuration = duration;
        this.updateTimeDisplay();
    }

    updateTimeDisplay() {
        const timeDisplay = this.element.querySelector('.time-display');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatTimeDisplay();
        }
    }

    getFileName() {
        if (!this.currentProject) {
            return PROJECT_CONFIG.content.fileInfo.noProjectFile;
        }
        return `${this.currentProject.id}${PROJECT_CONFIG.content.fileExtensions.project}`;
    }

    getBPM() {
        if (!this.currentProject) {
            return PROJECT_CONFIG.content.fileInfo.defaultBpm;
        }
        return this.currentProject.bpm.toString();
    }

    getTimeSignature() {
        if (!this.currentProject) {
            return '4/4';
        }
        return this.currentProject.timeSignature || '4/4';
    }

    getUsedClipIds() {
        if (!this.currentProject) return [];

        const usedIds = [];
        this.currentProject.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (!usedIds.includes(clip.id)) {
                    usedIds.push(clip.id);
                }
            });
        });
        return usedIds;
    }

    getClipUsageCount(clipId) {
        if (!this.currentProject) return 0;

        let count = 0;
        this.currentProject.tracks.forEach(track => {
            track.clips.forEach(clip => {
                if (clip.id === clipId) {
                    count++;
                }
            });
        });
        return count;
    }
}

// ===== TIMELINE COMPONENT =====
class TimelineComponent extends Component {
    init() {
        this.currentProject = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.timelineLength = null;
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.element.innerHTML = `
            <div class="timeline-container">
                <div class="tracks-area" id="tracks-area">
                    ${this.renderTimeRuler()}
                    ${this.renderTracks()}
                </div>
            </div>
        `;

        // Update timeline height based on calculated length
        this.updateTimelineHeight();

        // Update button states after rendering
        if (this.currentProject) {
            this.updateTrackButtonStates();
        }

        // Update clip playing states after rendering
        if (this.currentTime !== undefined) {
            this.updateClipPlayingStates(this.currentTime);
        }
    }

    updateTimelineHeight() {
        if (!this.currentProject || !this.timelineLength) return;

        const tracksArea = this.element.querySelector('.tracks-area');
        if (tracksArea) {
            tracksArea.style.height = `${this.timelineLength.height}px`;
            console.log(`Timeline height set to: ${this.timelineLength.height}px`);
        }

        // Update track clips areas height
        const trackClipsAreas = this.element.querySelectorAll('.track__clips-area');
        trackClipsAreas.forEach(area => {
            area.style.height = `${this.timelineLength.height}px`;
        });
    }

    renderTimeRuler() {
        if (!this.currentProject || !this.timelineLength) {
            return '';
        }

        const { bars, beatsPerBar } = this.timelineLength;
        const beats = [];

        for (let bar = 1; bar <= bars; bar++) {
            for (let beat = 1; beat <= beatsPerBar; beat++) {
                const isStrongBeat = beat === 1;
                const isFirstBeatInBar = beat === 1;
                beats.push({
                    label: isFirstBeatInBar ? `${bar}` : `${bar}.${beat}`,
                    isStrong: isStrongBeat,
                    isFirstBeatInBar
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
                                <span class="time-ruler__beat-label ${beat.isStrong ? 'time-ruler__beat-label--strong' : ''} ${beat.isFirstBeatInBar ? 'time-ruler__beat-label--bar' : ''}">
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

        // Create array of 8 track positions
        const trackPositions = Array(8).fill(null);

        // Fill active tracks in their remembered positions
        this.currentProject.tracks.forEach(track => {
            const position = track.position || 0;
            if (position < 8) {
                trackPositions[position] = this.renderTrack(track);
            }
        });

        // Fill remaining positions with disabled tracks
        for (let i = 0; i < 8; i++) {
            if (!trackPositions[i]) {
                trackPositions[i] = this.renderDisabledTrack(i);
            }
        }

        return trackPositions.join('');
    }

    renderDisabledTrack(position) {
        // Check if this is Vince's ambient sandbox project
        const isAmbientProject = this.currentProject?.id === 'ambient';

        return `
            <div class="track track--disabled" data-track-id="disabled-${position}">
                <div class="track__name track__name--disabled" data-track-id="disabled-${position}">Inactive</div>
                <div class="track__controls">
                    <button class="track__button track__button--disabled" title="Solo" data-track-action="solo" data-track-id="disabled-${position}" disabled>
                        🎧
                    </button>
                    <button class="track__button track__button--disabled" title="Mute" data-track-action="mute" data-track-id="disabled-${position}" disabled>
                        🔇
                    </button>
                    <input type="checkbox" class="track__checkbox track__checkbox--enable" title="Enable Track" data-track-action="enable" data-track-id="disabled-${position}" ${!isAmbientProject ? 'disabled' : ''}>
                </div>
                <div class="track__clips-area track__clips-area--disabled" data-track-id="disabled-${position}">
                    <div class="track__playhead"></div>
                    <div class="track__clips">
                    </div>
                </div>
            </div>
        `;
    }

    renderTrack(track) {
        const category = getCategoryByType(track.type);
        const trackColor = category ? category.color : '#6b7280';

        // Check if this is Vince's ambient sandbox project
        const isAmbientProject = this.currentProject?.id === 'ambient';

        return `
            <div class="track" data-track-id="${track.id}">
                <div class="track__name" data-track-id="${track.id}">${track.name}</div>
                <div class="track__controls">
                    <button class="track__button" title="Solo" data-track-action="solo" data-track-id="${track.id}">
                        🎧
                    </button>
                    <button class="track__button" title="Mute" data-track-action="mute" data-track-id="${track.id}">
                        🔇
                    </button>
                    <input type="checkbox" class="track__checkbox track__checkbox--disable" title="Disable Track" data-track-action="disable" data-track-id="${track.id}" checked ${!isAmbientProject ? 'disabled' : ''}>
                </div>
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
        const height = clip.duration * pixelsPerBeat;
        const top = clip.startTime * pixelsPerBeat;

        return `
            <div class="clip clip--dark"
                 data-clip-id="${clip.id}"
                 data-track-id="${track.id}"
                 data-clip-type="${clip.type}"
                 data-clip-duration="${clip.duration}"
                 data-clip-start-time="${clip.startTime}"
                 style="height: ${height}px; top: ${top}px;"
                 draggable="true">
                <div class="clip__resize-handle clip__resize-handle--top"></div>
                <div class="clip__resize-handle clip__resize-handle--bottom"></div>
                <div class="clip__content">
                    <div class="clip__name">${clip.name}</div>
                </div>
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

        // Checkbox changes
        this.element.addEventListener('change', (e) => {
            const checkbox = e.target.closest('.track__checkbox');
            if (checkbox) {
                const action = checkbox.dataset.trackAction;
                const trackId = checkbox.dataset.trackId;
                this.handleTrackAction(action, trackId);
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
        let resizingState = null;

        this.element.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.clip__resize-handle');
            if (!handle) return;

            e.preventDefault();
            e.stopPropagation();

            const clip = handle.closest('.clip');
            if (!clip) return;

            resizingState = this.initializeResizing(handle, clip, e.clientY);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        const handleMouseMove = (e) => {
            if (!resizingState) return;
            this.updateClipResize(resizingState, e.clientY);
        };

        const handleMouseUp = () => {
            if (!resizingState) return;
            this.finalizeClipResize(resizingState);
            resizingState = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    initializeResizing(handle, clip, startY) {
        const startHeight = clip.offsetHeight;
        const startTime = parseFloat(clip.dataset.clipStartTime);
        const originalDuration = parseFloat(clip.dataset.clipDuration);

        handle.classList.add('clip__resize-handle--resizing');
        clip.classList.add('clip--resizing');

        return { handle, clip, startY, startHeight, startTime, originalDuration };
    }

    updateClipResize(state, currentY) {
        const { handle, clip, startY, startHeight, startTime, originalDuration } = state;
        const deltaY = currentY - startY;
        const trackElement = clip.closest('.track');
        const trackId = trackElement.dataset.trackId;

        let newHeight = startHeight;
        let newDuration = originalDuration;
        let newStartTime = startTime;

        if (handle.classList.contains('clip__resize-handle--top')) {
            newHeight = Math.max(20, startHeight - deltaY);
            const heightChange = startHeight - newHeight;
            const timeChange = heightChange / this.getPixelsPerBeat();
            newStartTime = Math.max(0, startTime + timeChange);
            newDuration = Math.max(0.1, originalDuration - timeChange);
        } else {
            newHeight = Math.max(20, startHeight + deltaY);
            const heightChange = newHeight - startHeight;
            const timeChange = heightChange / this.getPixelsPerBeat();
            newDuration = Math.max(0.1, originalDuration + timeChange);
        }

        if (this.wouldOverlap(trackId, clip.dataset.clipId, newStartTime, newDuration)) {
            return;
        }

        clip.style.height = `${newHeight}px`;
        clip.style.top = `${newStartTime * this.getPixelsPerBeat()}px`;
        clip.dataset.clipStartTime = newStartTime.toString();
        clip.dataset.clipDuration = newDuration.toString();

        const durationElement = clip.querySelector('.clip__duration');
        if (durationElement) {
            durationElement.textContent = this.formatDuration(newDuration);
        }
    }

    finalizeClipResize(state) {
        const { handle, clip } = state;
        const trackId = clip.closest('.track').dataset.trackId;
        const clipId = clip.dataset.clipId;
        const newStartTime = parseFloat(clip.dataset.clipStartTime);
        const newDuration = parseFloat(clip.dataset.clipDuration);

        handle.classList.remove('clip__resize-handle--resizing');
        clip.classList.remove('clip--resizing');

        const event = new CustomEvent('clipResized', {
            detail: { trackId, clipId, newStartTime, newDuration }
        });
        this.element.dispatchEvent(event);
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
            // Always clear global drag data and cleanup previews
            window.globalDragData = null;
            this.cleanupDropPreviews();
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
        if (action === 'remove') {
            this.handleRemoveTrack(trackId);
            return;
        }

        if (action === 'disable') {
            this.handleDisableTrack(trackId);
            return;
        }

        if (action === 'enable') {
            this.handleEnableTrack(trackId);
            return;
        }

        const event = new CustomEvent('trackAction', {
            detail: { action, trackId }
        });
        this.element.dispatchEvent(event);
    }

    toggleTrackSolo(trackId) {
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.soloed = !track.soloed;

        if (track.soloed) {
            this.currentProject.tracks.forEach(t => {
                if (t.id !== trackId) t.soloed = false;
            });
        }

        this.updateComponents();
        this.dispatchTrackEvent('trackSoloChanged', { trackId, soloed: track.soloed });
    }

    toggleTrackMute(trackId) {
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) return;

        track.muted = !track.muted;
        this.updateComponents();
        this.dispatchTrackEvent('trackMuteChanged', { trackId, muted: track.muted });
    }

    dispatchTrackEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
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
        const newTrackName = `${PROJECT_CONFIG.content.timeline.newTrackPrefix}${trackCount + 1}`;

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

    handleEnableTrack(trackId) {
        if (!this.currentProject?.allowTrackManagement) {
            console.warn('Track management not allowed for this project');
            return;
        }

        // Extract position from disabled track ID
        const position = parseInt(trackId.replace('disabled-', ''));

        // Generate new track ID and name
        const trackCount = this.currentProject.tracks.length;
        const newTrackId = `track-${trackCount + 1}`;
        const newTrackName = `Track ${trackCount + 1}`;

        // Create new track object with remembered position
        const newTrack = {
            id: newTrackId,
            name: newTrackName,
            type: 'custom',
            clips: [],
            muted: false,
            soloed: false,
            position: position
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
        console.log(`Enabled new track: ${newTrackName} at position ${position}`);
    }

    handleDisableTrack(trackId) {
        if (!this.currentProject?.allowTrackManagement) {
            console.warn('Track management not allowed for this project');
            return;
        }

        // Find track
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) {
            console.warn(`Track not found: ${trackId}`);
            return;
        }

        // Store the position before removing
        const position = track.position || 0;

        // Remove track
        const trackIndex = this.currentProject.tracks.findIndex(t => t.id === trackId);
        const removedTrack = this.currentProject.tracks.splice(trackIndex, 1)[0];

        // Dispatch event to update app state
        const event = new CustomEvent('trackRemoved', {
            detail: { trackId, track: removedTrack, position }
        });
        this.element.dispatchEvent(event);

        // Re-render timeline
        this.render();
        console.log(`Disabled track: ${removedTrack.name} from position ${position}`);
    }

    formatCurrentTime() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    formatDuration(duration) {
        return formatDuration(duration);
    }

    setProject(project) {
        this.currentProject = project;

        // Calculate timeline length based on project data
        if (project) {
            this.timelineLength = calculateTimelineLength(project);
            console.log('Timeline length calculated:', this.timelineLength);
        }

        this.render();

        // Update clip playing states after rendering
        if (this.currentTime !== undefined) {
            this.updateClipPlayingStates(this.currentTime);
        }
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

        // Auto-scroll if playhead goes out of view
        this.autoScrollToPlayhead(time);

        // Update clip playing states
        this.updateClipPlayingStates(time);
    }

    updateClipPlayingStates(currentTime) {
        if (!this.currentProject) return;

        // Remove playing class from all clips
        const allClips = this.element.querySelectorAll('.clip');
        allClips.forEach(clip => {
            clip.classList.remove('clip--playing');
        });

        // Add playing class to clips that are currently being played
        this.currentProject.tracks.forEach(track => {
            track.clips.forEach(clip => {
                const clipStart = clip.startTime;
                const clipEnd = clip.startTime + clip.duration;

                // Check if playhead is within this clip's time range
                if (currentTime >= clipStart && currentTime < clipEnd) {
                    const clipElement = this.element.querySelector(`[data-clip-id="${clip.id}"]`);
                    if (clipElement) {
                        clipElement.classList.add('clip--playing');
                    }
                }
            });
        });
    }

    updatePlayheadPosition(time) {
        const playheads = this.element.querySelectorAll('.track__playhead');
        const beatHeight = PROJECT_CONFIG.layout.gridBeatWidth;
        const topPosition = time * beatHeight;

        playheads.forEach(playhead => {
            playhead.style.top = `${topPosition}px`;
        });
    }

    autoScrollToPlayhead(time) {
        const tracksArea = this.element.querySelector('.tracks-area');
        if (!tracksArea || !this.timelineLength) return;

        const playheadY = time * this.getPixelsPerBeat();
        const containerHeight = tracksArea.clientHeight;
        const scrollTop = tracksArea.scrollTop;
        const scrollBottom = scrollTop + containerHeight;

        // Check if playhead is outside visible area
        if (playheadY < scrollTop || playheadY > scrollBottom) {
            // Calculate target scroll position to center playhead
            const targetScrollTop = playheadY - (containerHeight / 2);

            // Smooth scroll to playhead position
            tracksArea.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
        }
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
        const clipsArea = trackElement.querySelector('.track__clips-area');
        if (!clipsArea) {
            return { startTime: 0, endTime: 0, isValid: false };
        }

        const rect = clipsArea.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const trackId = trackElement.dataset.trackId;

        const beatsPerPixel = 1 / this.getPixelsPerBeat();
        let startTime = y * beatsPerPixel;

        startTime = Math.round(startTime * 4) / 4;
        startTime = Math.max(0, startTime);

        const dragData = window.globalDragData;
        if (!dragData) return { startTime: 0, endTime: 0, isValid: false };

        const duration = dragData.clipDuration || 1;
        const endTime = startTime + duration;

        const wouldOverlap = this.wouldOverlap(trackId, null, startTime, duration);

        return {
            startTime,
            endTime,
            isValid: !wouldOverlap,
            y: startTime * this.getPixelsPerBeat(),
            height: duration * this.getPixelsPerBeat()
        };
    }

    showDropPreview(trackElement, dropPosition) {
        this.hideDropPreview(trackElement);

        if (dropPosition.isValid) {
            const preview = document.createElement('div');
            preview.className = 'clip-drop-preview';
            preview.style.cssText = `
                position: absolute;
                top: ${dropPosition.y}px;
                height: ${dropPosition.height}px;
                width: 100%;
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

// ===== EXPORTS =====
export {
    Component,
    HeaderComponent,
    SidebarComponent,
    TimelineComponent,
    VUMeterComponent
}; 