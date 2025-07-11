/**
 * Assembly Audio Editor - UI Components
 * Modular component system for building the audio editor interface
 */

import { PROJECT_CONFIG, PROJECT_DATA, CLIP_CATEGORIES, getCategoryByType, calculateTimelineLength, VINCE_RECORDING_VARIANTS } from './config.js';
import { assert, formatDuration, formatTimeDisplay, createCustomEvent, findTrackById, findClipIndexById, getClipEndTime } from './utils.js';

// ===== COMPONENT BASE CLASS =====
class Component {
    constructor(element) {
        assert(element, 'Component requires a DOM element');
        this.element = element;
        this.init();
    }

    init() {
    }

    render() {
    }

    destroy() {
        // Clear the element
        this.element.innerHTML = '';
    }
}

// ===== RECORDING POPUP COMPONENT =====
class RecordingPopupComponent extends Component {
    constructor(element, clipId, onRecordingComplete) {
        // Call super() first to initialize the component
        super(element);

        // Set properties after calling super()
        this.clipId = clipId;
        this.onRecordingComplete = onRecordingComplete;
        this.isRecording = false;
        this.recordingProgress = 0;
        this.recordingInterval = null;

        // Initialize the popup after all properties are set
        this.render();
        this.setupEventListeners();
    }

    init() {
        // Skip initialization in parent constructor - we'll do it manually after setting properties
        // This prevents the parent from calling render() before clipId is set
    }

    render() {
        // Use imported variants from config instead of duplicating data
        const variants = VINCE_RECORDING_VARIANTS[this.clipId] || [];

        this.element.innerHTML = `
            <div class="recording-popup">
                <div class="recording-popup__header">
                    <h3 class="recording-popup__title">🎤 Record Vince Clip</h3>
                    <button class="recording-popup__close" data-action="close">✕</button>
                </div>
                <div class="recording-popup__content">
                    ${this.isRecording ? this.renderRecordingProgress() : this.renderVariantSelection(variants)}
                </div>
            </div>
        `;
    }

    renderVariantSelection(variants) {
        return `
            <div class="recording-variants">
                <p class="recording-variants__description">Choose a recording style:</p>
                <div class="recording-variants__list">
                    ${variants.map(variant => `
                        <div class="recording-variant" data-variant-id="${variant.id}">
                            <div class="recording-variant__header">
                                <h4 class="recording-variant__name">${variant.name}</h4>
                                <span class="recording-variant__duration">${variant.duration} beats</span>
                            </div>
                            <p class="recording-variant__description">${variant.description}</p>
                            <button class="recording-variant__record-btn" data-variant-id="${variant.id}">
                                🔴 Record
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderRecordingProgress() {
        return `
            <div class="recording-progress">
                <div class="recording-progress__header">
                    <h4 class="recording-progress__title">🎤 Recording...</h4>
                    <div class="recording-progress__time">${this.getRecordingTime()}</div>
                </div>
                <div class="recording-progress__bar">
                    <div class="recording-progress__fill" style="width: ${this.recordingProgress}%"></div>
                </div>
                <div class="recording-progress__status">
                    <span class="recording-progress__text">Recording live take...</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.element.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-action="close"]');
            if (closeBtn) {
                this.close();
            }

            const recordBtn = e.target.closest('.recording-variant__record-btn');
            if (recordBtn && !this.isRecording) {
                const variantId = recordBtn.dataset.variantId;
                this.startRecording(variantId);
            }
        });
    }

    startRecording(variantId) {
        this.isRecording = true;
        this.recordingProgress = 0;
        this.selectedVariantId = variantId;

        this.render();

        // Simulate recording progress
        const recordingDuration = Math.random() * 7 + 3; // 3-10 seconds
        const interval = 50; // Update every 50ms
        const totalSteps = (recordingDuration * 1000) / interval;
        let currentStep = 0;

        this.recordingInterval = setInterval(() => {
            currentStep++;
            this.recordingProgress = (currentStep / totalSteps) * 100;

            if (currentStep >= totalSteps) {
                this.completeRecording();
            } else {
                this.updateProgress();
            }
        }, interval);
    }

    completeRecording() {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;

        // Get the selected variant from the imported config
        const variants = VINCE_RECORDING_VARIANTS[this.clipId] || [];
        const selectedVariant = variants.find(v => v.id === this.selectedVariantId);

        if (selectedVariant && this.onRecordingComplete) {
            this.onRecordingComplete(this.clipId, selectedVariant);
        }

        this.close();
    }

    updateProgress() {
        const progressFill = this.element.querySelector('.recording-progress__fill');
        const progressTime = this.element.querySelector('.recording-progress__time');

        if (progressFill) {
            progressFill.style.width = `${this.recordingProgress}%`;
        }

        if (progressTime) {
            progressTime.textContent = this.getRecordingTime();
        }
    }

    getRecordingTime() {
        const totalSeconds = 10; // Max recording time
        const elapsedSeconds = Math.floor((this.recordingProgress / 100) * totalSeconds);
        return `${elapsedSeconds}s / ${totalSeconds}s`;
    }

    close() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }

        // Remove the entire overlay container (which contains the popup)
        const overlay = document.querySelector('.recording-popup-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    destroy() {
        this.close();
        super.destroy();
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
        const event = createCustomEvent('projectSelected', { projectId });
        this.element.dispatchEvent(event);
    }
}

// ===== SIDEBAR COMPONENT =====
class SidebarComponent extends Component {
    init() {
        this.currentProject = null;
        this.isLooping = false;
        this.isPlaying = false;
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
            <div class="time-display">
                ${this.formatTimeDisplay()}
            </div>
            <div class="transport-controls">
                ${this.renderTransportControls()}
            </div>
            <div class="master-volume">
                ${this.renderMasterVolume()}
            </div>
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
                    <button class="transport-button ${button.id === 'play' && this.isPlaying ? 'transport-button--active' : ''}"
                            title="${button.title}"
                            data-transport="${button.id}">
                        ${button.icon}
                    </button>
                `).join('')}
                <div class="loop-toggle ${this.isLooping ? 'loop-toggle--active' : ''}" title="Loop">
                    🔁
                </div>
            </div>
        `;
    }

    renderMasterVolume() {
        return `
            <div class="master-volume__container">
                <div class="master-volume__label">
                    <span class="master-volume__icon">🔊</span>
                    <span class="master-volume__text">Master Volume</span>
                </div>
                <div class="master-volume__slider-container">
                    <input type="range" 
                           class="master-volume__slider" 
                           min="0" 
                           max="100" 
                           value="80" 
                           data-volume="master"
                           title="Master Volume">
                    <div class="master-volume__value">80%</div>
                </div>
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

        const result = Object.entries(clipsByCategory).map(([categoryId, clips]) => {
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

                // Check if this is a recording clip
                if (clip.needsRecording) {
                    return this.renderRecordingClip(clip, isUsed, usedCount);
                } else {
                    return this.renderNormalClip(clip, isUsed, usedCount);
                }
            }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        return result;
    }

    renderNormalClip(clip, isUsed, usedCount) {
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
    }

    renderRecordingClip(clip, isUsed, usedCount) {
        return `
            <div class="clip-item clip-item--recording ${isUsed ? 'clip-item--used' : ''}" 
                 data-clip-id="${clip.id}"
                 data-clip-type="${clip.type}"
                 data-clip-duration="${clip.duration || 0}">
                <div class="clip-item__name">
                    ${clip.name}
                    ${usedCount > 0 ? `<span class="clip-item__usage-count">(${usedCount})</span>` : ''}
                </div>
                <div class="clip-item__recording-controls">
                    <button class="clip-item__record-btn" data-clip-id="${clip.id}" title="Record this clip">
                        🔴 Record
                    </button>
                </div>
            </div>
        `;
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
        this.element.addEventListener('click', this.handleClick.bind(this));
        this.element.addEventListener('change', this.handleChange.bind(this));
        this.element.addEventListener('input', this.handleInput.bind(this));
        this.element.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.element.addEventListener('dragover', this.handleDragOver.bind(this));
        this.element.addEventListener('drop', this.handleDrop.bind(this));
        this.element.addEventListener('dragend', this.handleDragEnd.bind(this));
    }

    handleClick(e) {
        console.log('Sidebar click event:', e.target);

        // Handle recording button clicks
        const recordButton = e.target.closest('.clip-item__record-btn');
        if (recordButton) {
            const clipId = recordButton.dataset.clipId;
            console.log('Recording button clicked for clip:', clipId);
            this.handleRecordingButtonClick(clipId);
            return;
        }

        const transportButton = e.target.closest('[data-transport]');
        if (transportButton) {
            const action = transportButton.dataset.transport;
            console.log('Transport button clicked:', action);
            this.handleTransportAction(action);
        }

        // Handle loop toggle clicks
        const loopToggle = e.target.closest('.loop-toggle');
        if (loopToggle) {
            console.log('Loop toggle clicked');
            this.handleTransportAction('toggleLoop');
        }
    }

    handleChange(e) {
        console.log('Sidebar change event:', e.target);
        // No longer needed since we removed the checkbox
    }

    handleInput(e) {
        if (e.target.classList.contains('master-volume__slider')) {
            const value = e.target.value;
            const valueDisplay = e.target.parentElement.querySelector('.master-volume__value');
            if (valueDisplay) {
                valueDisplay.textContent = `${value}%`;
            }
            console.log('Master volume changed to:', value);
        }
    }

    handleDragStart(e) {
        const clipItem = e.target.closest('.clip-item');
        if (!clipItem) return;

        // Don't allow dragging of recording clips
        if (clipItem.classList.contains('clip-item--recording')) {
            e.preventDefault();
            return;
        }

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
        const event = createCustomEvent('transportAction', { action });
        this.element.dispatchEvent(event);
    }

    handleDragEnd(e) {
        window.globalDragData = null; // Clear global drag data
    }

    handleRecordingButtonClick(clipId) {
        this.showRecordingPopup(clipId);
    }

    showRecordingPopup(clipId) {
        // Create popup container
        const popupContainer = document.createElement('div');
        popupContainer.className = 'recording-popup-overlay';
        popupContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Create popup element
        const popupElement = document.createElement('div');
        popupContainer.appendChild(popupElement);

        // Add to DOM
        document.body.appendChild(popupContainer);

        // Create and initialize popup component
        const popup = new RecordingPopupComponent(popupElement, clipId, (originalClipId, selectedVariant) => {
            this.handleRecordingComplete(originalClipId, selectedVariant);
        });

        // Store reference for cleanup
        this.currentRecordingPopup = popup;
    }

    handleRecordingComplete(originalClipId, selectedVariant) {
        // Find the original clip in the project
        const clipIndex = findClipIndexById(this.currentProject.sidebarClips, originalClipId);

        if (clipIndex === -1) {
            console.error('Original clip not found:', originalClipId);
            return;
        }

        // Replace the original clip with the recorded variant
        const newClip = {
            id: selectedVariant.id,
            name: selectedVariant.name,
            duration: selectedVariant.duration,
            type: 'vince',
            needsRecording: false
        };

        this.currentProject.sidebarClips[clipIndex] = newClip;

        // Re-render the sidebar to show the new clip
        this.render();

        // Also refresh the clip repository specifically to ensure the new clip appears
        this.refreshClipRepository();

        // Dispatch event to notify app of recording completion
        const event = createCustomEvent('recordingCompleted', {
            originalClipId,
            newClip: this.currentProject.sidebarClips[clipIndex]
        });
        this.element.dispatchEvent(event);
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
            const newHTML = this.renderClipRepository();
            clipRepository.innerHTML = newHTML;
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

    setPlaying(playing) {
        this.isPlaying = playing;

        // Update the play button visual state
        const playButton = this.element.querySelector('[data-transport="play"]');
        if (playButton) {
            if (playing) {
                playButton.classList.add('transport-button--active');
            } else {
                playButton.classList.remove('transport-button--active');
            }
        }
    }

    setLoopState(isLooping) {
        this.isLooping = isLooping;

        // Update the loop toggle visual state
        const loopToggle = this.element.querySelector('.loop-toggle');
        if (loopToggle) {
            if (isLooping) {
                loopToggle.classList.add('loop-toggle--active');
            } else {
                loopToggle.classList.remove('loop-toggle--active');
            }
        }
    }

    setCurrentTime(time) {
        this.currentTime = time;
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
        this.isSeeking = false;
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

    renderTrackControls(trackId, isDisabled = false) {
        const isAmbientProject = this.currentProject?.id === 'ambient';
        const disabledClass = isDisabled ? 'track__button--disabled' : '';
        const disabledAttr = isDisabled ? 'disabled' : '';
        const checkboxDisabled = !isAmbientProject ? 'disabled' : '';
        const checkboxChecked = isDisabled ? '' : 'checked';
        const checkboxAction = isDisabled ? 'enable' : 'disable';
        const checkboxTitle = isDisabled ? 'Enable Track' : 'Disable Track';
        const checkboxClass = isDisabled ? 'track__checkbox--enable' : 'track__checkbox--disable';

        return `
            <div class="track__controls">
                <button class="track__button ${disabledClass}" title="Mute" data-track-action="mute" data-track-id="${trackId}" ${disabledAttr}>
                    🔇
                </button>
                <input type="checkbox" class="track__checkbox ${checkboxClass}" title="${checkboxTitle}" data-track-action="${checkboxAction}" data-track-id="${trackId}" ${checkboxChecked} ${checkboxDisabled}>
            </div>
        `;
    }

    renderDisabledTrack(position) {
        return `
            <div class="track track--disabled" data-track-id="disabled-${position}">
                <div class="track__name track__name--disabled" data-track-id="disabled-${position}">Inactive</div>
                ${this.renderTrackControls(`disabled-${position}`, true)}
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

        return `
            <div class="track" data-track-id="${track.id}">
                <div class="track__name" data-track-id="${track.id}">${track.name}</div>
                ${this.renderTrackControls(track.id)}
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

        const event = createCustomEvent('clipResized', { trackId, clipId, newStartTime, newDuration });
        this.element.dispatchEvent(event);
    }

    wouldOverlap(trackId, excludeClipId, startTime, duration) {
        const endTime = startTime + duration;
        const track = this.currentProject.tracks.find(t => t.id === trackId);
        if (!track) return false;

        return track.clips.some(clip => {
            if (clip.id === excludeClipId) return false;
            const clipEnd = getClipEndTime(clip);
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

        if (action === 'mute') {
            // Toggle mute button visual state only
            const muteButton = this.element.querySelector(`[data-track-id="${trackId}"] [data-track-action="mute"]`);
            if (muteButton) {
                const isCurrentlyMuted = muteButton.textContent === '🔇';
                muteButton.textContent = isCurrentlyMuted ? '🔊' : '🔇';
            }
            return;
        }

        const event = new CustomEvent('trackAction', {
            detail: { action, trackId }
        });
        this.element.dispatchEvent(event);
    }



    updateTrackButtonStates() {
        this.currentProject.tracks.forEach(track => {
            const muteButton = this.element.querySelector(`[data-track-id="${track.id}"] [data-track-action="mute"]`);
            if (muteButton) {
                // Toggle between muted and unmuted icons
                muteButton.textContent = muteButton.classList.contains('track__button--active') ? '🔇' : '🔊';
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
        const track = findTrackById(this.currentProject.tracks, trackId);
        if (track) {
            track.name = newName.trim();
            console.log(`Track name changed: ${trackId} -> ${newName}`);

            // Dispatch event
            const event = createCustomEvent('trackNameChanged', { trackId, newName: newName.trim() });
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
            clips: []
        };

        // Add to project
        this.currentProject.tracks.push(newTrack);

        // Dispatch event to update app state
        const event = createCustomEvent('trackAdded', { track: newTrack });
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
        const event = createCustomEvent('trackRemoved', { trackId, track: removedTrack });
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
            position: position
        };

        // Add to project
        this.currentProject.tracks.push(newTrack);

        // Dispatch event to update app state
        const event = createCustomEvent('trackAdded', { track: newTrack });
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
        const track = findTrackById(this.currentProject.tracks, trackId);
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
        const event = createCustomEvent('trackRemoved', { trackId, track: removedTrack, position });
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

    // New method to force scroll to playhead (used for transport controls)
    scrollToPlayhead(time) {
        const timelineContainer = this.element.querySelector('.timeline-container');
        if (!timelineContainer || !this.timelineLength) return;

        const playheadY = time * this.getPixelsPerBeat();
        const containerHeight = timelineContainer.clientHeight;

        // Calculate target scroll position to center playhead
        const targetScrollTop = playheadY - (containerHeight * 0.5);

        // Set seeking state to prevent auto-scroll interference
        this.isSeeking = true;

        // Instant scroll to playhead position
        timelineContainer.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'auto'
        });

        // Clear seeking state after a short delay to allow auto-scroll to resume
        setTimeout(() => {
            this.isSeeking = false;
        }, 100);
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
                const clipEnd = getClipEndTime(clip);

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
        // Skip auto-scroll if we're in a seeking operation
        if (this.isSeeking) return;

        const timelineContainer = this.element.querySelector('.timeline-container');
        if (!timelineContainer || !this.timelineLength) return;

        const playheadY = time * this.getPixelsPerBeat();
        const containerHeight = timelineContainer.clientHeight;
        const scrollTop = timelineContainer.scrollTop;
        const scrollBottom = scrollTop + containerHeight;

        // Calculate the 50% threshold point in the visible area
        const fiftyPercentPoint = scrollTop + (containerHeight * 0.5);

        // Check if playhead has reached or passed the 50% point
        if (playheadY >= fiftyPercentPoint) {
            // Calculate target scroll position to keep playhead at 50% of visible area
            const targetScrollTop = playheadY - (containerHeight * 0.5);

            // Instant smooth scroll to playhead position
            timelineContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'auto'
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
    VUMeterComponent,
    RecordingPopupComponent
}; 