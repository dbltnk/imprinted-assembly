/**
 * Assembly Audio Editor - UI Components
 * Modular component system for building the audio editor interface
 */

import { PROJECT_CONFIG, PROJECT_DATA, CLIP_CATEGORIES, getCategoryByType } from './config.js';

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
        // Clean up event listeners
        this.eventListeners.forEach((listener, event) => {
            this.element.removeEventListener(event, listener);
        });
        this.eventListeners.clear();

        // Destroy children
        this.children.forEach(child => {
            if (child.destroy) {
                child.destroy();
            }
        });
        this.children.clear();
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
                document.body.removeChild(dropdown);
            }
        });

        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && !loadButton.contains(e.target)) {
                document.body.removeChild(dropdown);
                document.removeEventListener('click', closeDropdown);
            }
        };
        document.addEventListener('click', closeDropdown);
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
        this.render();
        this.setupEventListeners();
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
                    <input type="checkbox" class="loop-toggle__checkbox" data-transport="loop">
                    <span class="loop-toggle__label">${transport.loopToggle.label}</span>
                </label>
            </div>
        `;
    }

    renderClipRepository() {
        if (!this.currentProject) {
            return '<div class="clip-repository__empty">Select a project to view clips</div>';
        }

        // Group clips by category
        const clipsByCategory = this.groupClipsByCategory();

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
                                 draggable="true">
                                ${clip.name}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    groupClipsByCategory() {
        const clipsByCategory = {};

        this.currentProject.tracks.forEach(track => {
            if (!clipsByCategory[track.type]) {
                clipsByCategory[track.type] = [];
            }
            clipsByCategory[track.type].push(...track.clips);
        });

        // Add extra clips for ambient project
        if (this.currentProject.extraClips) {
            this.currentProject.extraClips.forEach(clip => {
                if (!clipsByCategory[clip.type]) {
                    clipsByCategory[clip.type] = [];
                }
                clipsByCategory[clip.type].push(clip);
            });
        }

        return clipsByCategory;
    }

    setupEventListeners() {
        // Transport controls
        this.element.addEventListener('click', (e) => {
            const transportButton = e.target.closest('[data-transport]');
            if (transportButton) {
                const action = transportButton.dataset.transport;
                this.handleTransportAction(action);
            }
        });

        // Clip drag and drop
        this.element.addEventListener('dragstart', (e) => {
            const clipItem = e.target.closest('[data-clip-id]');
            if (clipItem) {
                const clipId = clipItem.dataset.clipId;
                e.dataTransfer.setData('text/plain', clipId);
                e.dataTransfer.effectAllowed = 'copy';
            }
        });
    }

    handleTransportAction(action) {
        // Dispatch custom event for transport actions
        const event = new CustomEvent('transportAction', {
            detail: { action }
        });
        this.element.dispatchEvent(event);
    }

    setProject(project) {
        this.currentProject = project;
        this.render();
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
                <div class="track__clips-area">
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
                 style="width: ${width}px; left: ${left}px;"
                 draggable="true">
                <div class="clip__resize-handle clip__resize-handle--left"></div>
                <div class="clip__resize-handle clip__resize-handle--right"></div>
                ${clip.name}
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
        // Track controls
        this.element.addEventListener('click', (e) => {
            const trackButton = e.target.closest('[data-track-action]');
            if (trackButton) {
                const action = trackButton.dataset.trackAction;
                const trackId = trackButton.dataset.trackId;
                this.handleTrackAction(action, trackId);
            }

            const addTrackButton = e.target.closest('[data-action="add-track"]');
            if (addTrackButton) {
                this.handleAddTrack();
            }
        });

        // Track name editing
        this.element.addEventListener('blur', (e) => {
            const trackName = e.target.closest('.track__name');
            if (trackName) {
                const trackId = trackName.dataset.trackId;
                const newName = trackName.textContent.trim();
                this.handleTrackNameChange(trackId, newName);
            }
        }, true);

        // Clip drag and drop
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            const clipId = e.dataTransfer.getData('text/plain');
            const trackElement = e.target.closest('.track');
            if (trackElement && clipId) {
                const trackId = trackElement.dataset.trackId;
                const rect = trackElement.getBoundingClientRect();
                const x = e.clientX - rect.left;
                this.handleClipDrop(clipId, trackId, x);
            }
        });
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

    handleClipDrop(clipId, trackId, x) {
        const event = new CustomEvent('clipDrop', {
            detail: { clipId, trackId, x }
        });
        this.element.dispatchEvent(event);
    }

    formatCurrentTime() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = Math.floor(this.currentTime % 60);
        const tenths = Math.floor((this.currentTime % 1) * 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
    }

    setProject(project) {
        this.currentProject = project;
        this.render();
    }

    setCurrentTime(time) {
        this.currentTime = time;
        const timeDisplay = this.element.querySelector('.timeline-header__time');
        if (timeDisplay) {
            timeDisplay.textContent = this.formatCurrentTime();
        }
    }

    setPlaying(playing) {
        this.isPlaying = playing;
        // Update playhead animation or other visual indicators
    }
}

// ===== VU METER COMPONENT =====
class VUMeterComponent extends Component {
    init() {
        this.level = 0;
        this.render();
        this.startAnimation();
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
        // Simulate VU meter movement
        setInterval(() => {
            this.level = Math.random() * 100;
            this.render();
        }, 100);
    }

    setLevel(level) {
        this.level = Math.max(0, Math.min(100, level));
        this.render();
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