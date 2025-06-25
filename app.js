// Browser Logging System for LLM Debugging
// Captures console output and DOM state with minimal performance impact

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
        this.updateDebugPanel();
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
            this.updateDebugPanel();

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

    updateDebugPanel() {
        // Debug panel removed - no longer needed
    }

    setupEventListeners() {
        // Test buttons
        document.getElementById('test-log')?.addEventListener('click', () => {
            console.log('Test log message from button click');
        });

        document.getElementById('test-warn')?.addEventListener('click', () => {
            console.warn('Test warning message from button click');
        });

        document.getElementById('test-error')?.addEventListener('click', () => {
            console.error('Test error message from button click');
        });

        document.getElementById('add-element')?.addEventListener('click', () => {
            const container = document.getElementById('dynamic-content');
            const newElement = document.createElement('div');
            newElement.className = 'bg-yellow-100 border border-yellow-300 p-4 rounded mb-4';
            newElement.innerHTML = `
                <h4 class="font-semibold text-yellow-800">Dynamic Element ${Date.now()}</h4>
                <p class="text-yellow-700">This element was added dynamically and will be captured in DOM snapshots.</p>
            `;
            container.appendChild(newElement);
            console.log('Added dynamic element to DOM');
        });
    }
}

// Initialize logging system when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new BrowserLogger());
} else {
    new BrowserLogger();
}

// --- Assembly Prototype Logic ---
document.addEventListener('DOMContentLoaded', function () {
    console.log('[Assembly] DOMContentLoaded, initializing UI');

    // Project data (tracks, clips, BPM, etc.)
    const PROJECTS = {
        a: {
            name: 'Piece together a linear sentence',
            filename: 'sentence.ass',
            bpm: 90,
            tracks: [
                { name: 'Sentence', clips: [] }
            ],
            clipRepo: [
                {
                    category: 'Words', icon: '📝', clips: [
                        { name: 'The', length: 1 },
                        { name: 'quick', length: 1 },
                        { name: 'brown', length: 1 },
                        { name: 'fox', length: 1 },
                        { name: 'jumps', length: 1 },
                        { name: 'over', length: 1 },
                        { name: 'the', length: 1 },
                        { name: 'lazy', length: 1 },
                        { name: 'dog', length: 1 }
                    ]
                }
            ],
            allowAddTrack: false
        },
        b: {
            name: 'Choose instrument options',
            filename: 'band-options.ass',
            bpm: 110,
            tracks: [
                { name: 'Drums', clips: [] },
                { name: 'Bass', clips: [] },
                { name: 'Guitar', clips: [] },
                { name: 'Vocals', clips: [] }
            ],
            clipRepo: [
                { category: 'Drums', icon: '🥁', clips: ['Rock Beat', 'Funk Groove', 'Jazz Shuffle'] },
                { category: 'Bass', icon: '🎸', clips: ['Walking Bass', 'Synth Bass', 'Slap Bass'] },
                { category: 'Guitar', icon: '🎶', clips: ['Clean Chords', 'Distorted Riff', 'Arpeggio'] },
                { category: 'Vocals', icon: '🎤', clips: ['Lead Take 1', 'Lead Take 2'] }
            ],
            allowAddTrack: false
        },
        c: {
            name: "Vince's ambient sandbox",
            filename: 'vince-sandbox.ass',
            bpm: 70,
            tracks: [
                { name: 'Background Loop', clips: [] },
                { name: "Vince's Guitar", clips: [] },
                { name: 'Field Recording', clips: [] }
            ],
            clipRepo: [
                { category: 'Loops', icon: '🔁', clips: ['Ambient Pad', 'Tape Loop'] },
                { category: 'Guitar', icon: '🎸', clips: ['Guitar Phrase 1', 'Guitar Phrase 2'] },
                { category: 'Field', icon: '🌳', clips: ['Birds', 'Rain', 'Street Noise'] },
                { category: 'Extra', icon: '✨', clips: ['Synth Texture', 'Perc Loop'] }
            ],
            allowAddTrack: true
        },
        d: {
            name: 'THE SONG',
            filename: 'the-song.ass',
            bpm: 120,
            tracks: [
                { name: 'Main Instrument', clips: [] },
                { name: 'Vocals', clips: [] },
                { name: 'Rhythm Section', clips: [] },
                { name: 'Viola Material', clips: [] },
                { name: 'Bass', clips: [] }
            ],
            clipRepo: [
                { category: 'Main', icon: '🎹', clips: ['Piano Intro', 'Guitar Verse'] },
                { category: 'Vocals', icon: '🎤', clips: ["Vince's Take", "Viola's Take"] },
                { category: 'Rhythm', icon: '🥁', clips: ['Drum Groove', 'Percussion'] },
                { category: 'Viola', icon: '🎻', clips: ['Viola Melody', 'Viola Harmony'] },
                { category: 'Bass', icon: '🎸', clips: ['Electric Bass', 'Synth Bass'] }
            ],
            allowAddTrack: false
        }
    };

    // --- State ---
    let currentProjectKey = 'a';
    let state = {};

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function initProject(key) {
        currentProjectKey = key;
        // Deep clone to avoid mutating PROJECTS
        state = {
            bpm: PROJECTS[key].bpm,
            allowAddTrack: PROJECTS[key].allowAddTrack,
            tracks: deepClone(PROJECTS[key].tracks),
            clipRepo: deepClone(PROJECTS[key].clipRepo),
            timelineBeats: 32,
        };
        console.log(`[UI] Loaded project: ${PROJECTS[key].name} (${PROJECTS[key].filename})`);
        renderAll();
    }

    // --- UI Rendering ---
    function renderAll() {
        renderBPM();
        renderClipRepo();
        renderTimeRuler();
        renderTracks();
        renderAddTrackBar();
        renderTopBar();
        renderLoadMenu();
    }

    function renderBPM() {
        document.getElementById('bpmDisplay').textContent = state.bpm;
    }

    function renderClipRepo() {
        const repo = document.getElementById('clipRepo');
        repo.innerHTML = '';
        const used = getClipsInTracks();
        state.clipRepo.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'mb-2';
            const label = document.createElement('div');
            label.className = 'flex items-center mb-1 text-teal-300 font-semibold';
            label.innerHTML = `<span class="mr-2">${group.icon}</span> ${group.category}`;
            groupDiv.appendChild(label);
            const clipsDiv = document.createElement('div');
            clipsDiv.className = 'flex flex-wrap gap-2';
            group.clips.forEach(clip => {
                if (!used.has(clip.name)) {
                    const btn = document.createElement('div');
                    btn.className = 'clip-block bg-gray-700 hover:bg-teal-700 text-teal-200';
                    btn.textContent = clip.name;
                    btn.setAttribute('draggable', 'true');
                    btn.dataset.clip = clip.name;
                    btn.dataset.length = clip.length;
                    btn.dataset.category = group.category;
                    btn.addEventListener('dragstart', onClipDragStart);
                    clipsDiv.appendChild(btn);
                }
            });
            groupDiv.appendChild(clipsDiv);
            repo.appendChild(groupDiv);
        });
    }

    function renderTimeRuler() {
        const ruler = document.getElementById('timeRuler');
        ruler.innerHTML = '';
        const beats = state.timelineBeats;
        for (let i = 0; i < beats; i++) {
            const mark = document.createElement('div');
            mark.className = 'flex flex-col items-center justify-end h-full relative';
            mark.style.width = '48px';
            mark.innerHTML = `<div class="text-xs text-gray-400">${i + 1}</div><div class="w-px h-4 bg-teal-700"></div>`;
            ruler.appendChild(mark);
        }
        // Snapping grid overlay
        const grid = document.createElement('div');
        grid.className = 'snapping-grid';
        for (let i = 0; i < beats; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line';
            line.style.left = `${i * 48}px`;
            grid.appendChild(line);
        }
        ruler.appendChild(grid);
    }

    function renderTracks() {
        const container = document.getElementById('tracksContainer');
        container.innerHTML = '';
        state.tracks.forEach((track, tIdx) => {
            const row = document.createElement('div');
            row.className = 'track-row h-16';
            // Track controls
            const controls = document.createElement('div');
            controls.className = 'track-controls';
            // Mute
            const muteBtn = document.createElement('button');
            muteBtn.className = 'mute-btn';
            muteBtn.innerHTML = '🔇';
            muteBtn.title = 'Mute';
            muteBtn.onclick = () => toggleTrackMute(tIdx);
            controls.appendChild(muteBtn);
            // Solo
            const soloBtn = document.createElement('button');
            soloBtn.className = 'solo-btn';
            soloBtn.innerHTML = '🎵';
            soloBtn.title = 'Solo';
            soloBtn.onclick = () => toggleTrackSolo(tIdx);
            controls.appendChild(soloBtn);
            row.appendChild(controls);
            // Track name (editable)
            const nameInput = document.createElement('input');
            nameInput.className = 'track-name bg-gray-900 text-gray-100';
            nameInput.value = track.name;
            nameInput.onchange = e => renameTrack(tIdx, e.target.value);
            row.appendChild(nameInput);
            // Timeline for this track
            const timeline = document.createElement('div');
            timeline.className = 'timeline-track flex-1 w-full';
            timeline.dataset.track = tIdx;
            timeline.style.position = 'relative'; // Ensure absolute positioning for clips
            timeline.style.background = '#0f172a'; // Tailwind's bg-teal-950
            timeline.ondragover = e => onTimelineDragOver(e, tIdx);
            timeline.ondrop = e => onTimelineDrop(e, tIdx);
            timeline.onmouseleave = onTimelineMouseLeave;
            // Render clips
            if (!track.clips || track.clips.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'text-gray-500 text-xs w-full text-center pointer-events-none select-none';
                placeholder.textContent = 'Drag clips here';
                timeline.appendChild(placeholder);
            } else {
                (track.clips || []).forEach((clip, cIdx) => {
                    const clipDiv = document.createElement('div');
                    clipDiv.className = 'clip-block bg-teal-800 text-white';
                    // Positioning
                    clipDiv.style.position = 'absolute';
                    clipDiv.style.left = `${(clip.start || 0) * 48}px`;
                    clipDiv.style.width = `${(clip.length || 4) * 48}px`;
                    clipDiv.style.top = '8px';
                    clipDiv.style.height = '32px';
                    clipDiv.textContent = clip.name;
                    clipDiv.draggable = true;
                    clipDiv.dataset.track = tIdx;
                    clipDiv.dataset.clip = cIdx;
                    // Drag logic
                    clipDiv.addEventListener('dragstart', e => onTimelineClipDragStart(e, tIdx, cIdx));
                    // Resize handles
                    const leftHandle = document.createElement('div');
                    leftHandle.className = 'clip-handle left-0';
                    leftHandle.style.cursor = 'ew-resize';
                    leftHandle.addEventListener('mousedown', e => onClipResizeStart(e, tIdx, cIdx, 'left'));
                    clipDiv.appendChild(leftHandle);
                    const rightHandle = document.createElement('div');
                    rightHandle.className = 'clip-handle right-0';
                    rightHandle.style.cursor = 'ew-resize';
                    rightHandle.addEventListener('mousedown', e => onClipResizeStart(e, tIdx, cIdx, 'right'));
                    clipDiv.appendChild(rightHandle);
                    timeline.appendChild(clipDiv);
                });
            }
            row.appendChild(timeline);
            container.appendChild(row);
            console.log(`[UI] Rendered track ${tIdx}: ${track.name}`);
        });
    }

    function renderAddTrackBar() {
        const bar = document.getElementById('addTrackBar');
        if (state.allowAddTrack) {
            bar.classList.remove('hidden');
        } else {
            bar.classList.add('hidden');
        }
    }

    function renderTopBar() {
        // Update project name and filename in the top bar
        const topBar = document.querySelector('.top-bar-project-info');
        if (topBar) {
            const project = PROJECTS[currentProjectKey];
            topBar.innerHTML = `<span class="text-2xl font-bold tracking-wide mr-8 text-teal-400">Assembly</span>` +
                `<span class="ml-4 text-teal-200 text-base">${project.name} <span class="text-gray-400">(${project.filename})</span></span>`;
        }
    }

    function renderLoadMenu() {
        // Update the load menu to show filenames
        const loadDropdown = document.getElementById('loadDropdown');
        if (loadDropdown) {
            loadDropdown.innerHTML = '';
            Object.entries(PROJECTS).forEach(([key, project]) => {
                const btn = document.createElement('button');
                btn.className = 'w-full text-left px-4 py-2 hover:bg-gray-700';
                btn.dataset.project = key;
                btn.innerHTML = `${project.name} <span class="text-gray-400 ml-2">${project.filename}</span>`;
                btn.onclick = () => {
                    initProject(key);
                    loadDropdown.classList.add('hidden');
                };
                loadDropdown.appendChild(btn);
            });
        }
    }

    // --- Event Handlers ---
    const loadBtn = document.getElementById('loadDropdownBtn');
    const loadDropdown = document.getElementById('loadDropdown');
    loadBtn.onclick = () => {
        loadDropdown.classList.toggle('hidden');
    };
    loadDropdown.querySelectorAll('button').forEach(btn => {
        btn.onclick = () => {
            initProject(btn.dataset.project);
            loadDropdown.classList.add('hidden');
        };
    });

    document.body.addEventListener('click', e => {
        if (!loadBtn.contains(e.target) && !loadDropdown.contains(e.target)) {
            loadDropdown.classList.add('hidden');
        }
    });

    // Playback controls (UI only)
    document.getElementById('playBtn').onclick = () => { logAction('Play'); };
    document.getElementById('stopBtn').onclick = () => { logAction('Stop'); };
    document.getElementById('rewindBtn').onclick = () => { logAction('Rewind'); };
    document.getElementById('ffBtn').onclick = () => { logAction('Fast Forward'); };
    document.getElementById('loopBtn').onclick = () => { logAction('Loop Toggle'); };

    function logAction(action) {
        console.log(`[UI] ${action} clicked`);
    }

    // --- Clip Drag/Drop ---
    let dragClip = null;
    function onClipDragStart(e) {
        dragClip = {
            name: e.target.dataset.clip,
            category: e.target.dataset.category,
            length: parseInt(e.target.dataset.length, 10) || 4,
            start: 0
        };
        e.dataTransfer.effectAllowed = 'copy';
        console.log(`[UI] Dragging clip '${dragClip.name}' (length: ${dragClip.length}) from sidebar`);
    }
    function onTimelineDragOver(e, tIdx) {
        e.preventDefault();
        if (!dragClip) return;
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const beat = Math.max(0, Math.round(x / 48));
        showPreview(tIdx, beat, dragClip.length);
    }
    function onTimelineDrop(e, tIdx) {
        if (dragClip) {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const beat = Math.max(0, Math.round(x / 48));
            if (!trackHasOverlap(tIdx, beat, dragClip.length)) {
                state.tracks[tIdx].clips = state.tracks[tIdx].clips || [];
                state.tracks[tIdx].clips.push({
                    name: dragClip.name,
                    start: beat,
                    length: dragClip.length
                });
                console.log(`[UI] Dropped clip '${dragClip.name}' (length: ${dragClip.length}) on track ${tIdx} at beat ${beat}`);
                renderTracks();
                renderClipRepo();
            }
            dragClip = null;
            removePreview();
        }
    }
    function trackHasOverlap(tIdx, start, length, ignoreIdx = null) {
        const clips = state.tracks[tIdx].clips || [];
        for (let i = 0; i < clips.length; i++) {
            if (ignoreIdx !== null && i === ignoreIdx) continue;
            const c = clips[i];
            if (start < c.start + c.length && start + length > c.start) return true;
        }
        return false;
    }
    // Timeline clip drag (move)
    let movingClip = null;
    function onTimelineClipDragStart(e, tIdx, cIdx) {
        movingClip = { tIdx, cIdx, offsetX: e.offsetX };
        document.addEventListener('dragover', onTimelineClipDragOver);
        document.addEventListener('drop', onTimelineClipDrop);
        // Remove from track immediately for visual feedback
        const clip = state.tracks[tIdx].clips[cIdx];
        state.tracks[tIdx].clips.splice(cIdx, 1);
        renderTracks();
        renderClipRepo();
        console.log(`[UI] Removed clip '${clip.name}' from track ${tIdx}, returned to sidebar`);
    }
    function onTimelineClipDragOver(e) { e.preventDefault(); }
    function onTimelineClipDrop(e) {
        if (movingClip) {
            const { tIdx, cIdx, offsetX } = movingClip;
            const container = document.querySelector(`[data-track='${tIdx}']`);
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left - offsetX;
            const beat = Math.max(0, Math.round(x / 48));
            const clip = state.tracks[tIdx].clips[cIdx];
            if (!trackHasOverlap(tIdx, beat, clip.length, cIdx)) {
                clip.start = beat;
                renderTracks();
            }
            movingClip = null;
            document.removeEventListener('dragover', onTimelineClipDragOver);
            document.removeEventListener('drop', onTimelineClipDrop);
        }
    }

    // --- Clip Resizing ---
    let resizing = null;
    document.addEventListener('mousedown', function (e) {
        if (e.target.classList.contains('clip-handle')) {
            const clipDiv = e.target.parentElement;
            resizing = {
                tIdx: parseInt(clipDiv.dataset.track),
                cIdx: parseInt(clipDiv.dataset.clip),
                side: e.target.classList.contains('left-0') ? 'left' : 'right',
                startX: e.clientX
            };
            document.body.style.userSelect = 'none';
        }
    });
    document.addEventListener('mousemove', function (e) {
        if (resizing) {
            const { tIdx, cIdx, side, startX } = resizing;
            const dx = e.clientX - startX;
            const beatsDelta = Math.round(dx / 48);
            const clip = state.tracks[tIdx].clips[cIdx];
            if (side === 'left') {
                let newStart = Math.max(0, clip.start + beatsDelta);
                let newLength = clip.length - beatsDelta;
                if (newLength > 0 && !trackHasOverlap(tIdx, newStart, newLength, cIdx)) {
                    clip.start = newStart;
                    clip.length = newLength;
                    resizing.startX = e.clientX;
                    renderTracks();
                }
            } else if (side === 'right') {
                let newLength = Math.max(1, clip.length + beatsDelta);
                if (!trackHasOverlap(tIdx, clip.start, newLength, cIdx)) {
                    clip.length = newLength;
                    resizing.startX = e.clientX;
                    renderTracks();
                }
            }
        }
    });
    document.addEventListener('mouseup', function () {
        if (resizing) {
            resizing = null;
            document.body.style.userSelect = '';
        }
    });

    // --- Track Controls ---
    function toggleTrackMute(tIdx) {
        state.tracks[tIdx].muted = !state.tracks[tIdx].muted;
        renderTracks();
    }
    function toggleTrackSolo(tIdx) {
        state.tracks[tIdx].solo = !state.tracks[tIdx].solo;
        renderTracks();
    }
    function renameTrack(tIdx, newName) {
        state.tracks[tIdx].name = newName;
        renderTracks();
    }

    // --- Add/Remove Track (only for project c) ---
    const addTrackBtn = document.getElementById('addTrackBtn');
    if (addTrackBtn) {
        addTrackBtn.onclick = () => {
            state.tracks.push({ name: 'New Track', clips: [] });
            renderTracks();
        };
    }

    // --- Drag preview logic ---
    let previewDiv = null;
    let previewTrackIdx = null;
    let previewBeat = null;

    function showPreview(tIdx, beat, clipLength) {
        removePreview();
        const timeline = document.querySelector(`.timeline-track[data-track='${tIdx}']`);
        if (!timeline) return;
        previewDiv = document.createElement('div');
        previewDiv.className = 'clip-block bg-teal-400 bg-opacity-50 text-white pointer-events-none';
        previewDiv.style.position = 'absolute';
        previewDiv.style.left = `${beat * 48}px`;
        previewDiv.style.width = `${(clipLength || 4) * 48}px`;
        previewDiv.style.top = '8px';
        previewDiv.style.height = '32px';
        previewDiv.style.opacity = '0.5';
        previewDiv.textContent = dragClip ? dragClip.name : '';
        timeline.appendChild(previewDiv);
        previewTrackIdx = tIdx;
        previewBeat = beat;
        console.log(`[UI] Previewing drop: track ${tIdx}, beat ${beat}`);
    }
    function removePreview() {
        if (previewDiv && previewDiv.parentElement) previewDiv.parentElement.removeChild(previewDiv);
        previewDiv = null;
        previewTrackIdx = null;
        previewBeat = null;
    }
    // Remove preview on mouse leave
    function onTimelineMouseLeave(e) {
        removePreview();
    }

    // --- Init ---
    initProject('a');

    // --- CLIP LENGTHS ---
    function getClipsInTracks() {
        const used = new Set();
        state.tracks.forEach(track => {
            (track.clips || []).forEach(clip => used.add(clip.name));
        });
        return used;
    }
});

// Remove all global stateful function definitions below this line 