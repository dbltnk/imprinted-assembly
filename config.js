/**
 * Assembly Audio Editor - Configuration
 * Centralized configuration for all project data and settings
 */

import { assert, getClipEndTime } from './utils.js';

// ===== PROJECT CONFIGURATION =====
export const PROJECT_CONFIG = {
    // Application metadata
    app: {
        name: 'Assembly',
        version: '1.0.0',
        description: 'Multi-track audio editor prototype for Unity game integration'
    },

    // Layout constants
    layout: {
        headerHeight: 56,
        sidebarWidth: 240,
        vuMeterWidth: 64,
        trackHeight: 56,
        trackControlsWidth: 240,
        gridBeatWidth: 40,
        maxTracksVisible: 6,
        maxTracks: 7
    },

    // Visual theme
    theme: {
        colors: {
            bgPrimary: '#111827',      // gray-900
            bgSecondary: '#1f2937',    // gray-800
            bgTertiary: '#374151',     // gray-700
            border: '#4b5563',         // gray-600
            textPrimary: '#f9fafb',    // gray-100
            textSecondary: '#d1d5db',  // gray-300
            textMuted: '#9ca3af',      // gray-400
            accentPrimary: '#38bdf8',  // sky-400
            accentSecondary: '#0ea5e9', // sky-500
            accentDark: '#0369a1',     // sky-700
            accentDarker: '#0c4a6e'    // sky-800
        },
        spacing: {
            xs: '0.25rem',
            sm: '0.5rem',
            md: '1rem',
            lg: '1.5rem',
            xl: '2rem'
        },
        borderRadius: {
            sm: '0.25rem',
            md: '0.5rem',
            lg: '0.75rem'
        }
    },

    // Transport controls configuration
    transport: {
        buttons: [
            { id: 'play', icon: '▶', title: 'Play/Pause', action: 'play' },
            { id: 'stop', icon: '⏹', title: 'Stop', action: 'stop' },
            { id: 'rewind', icon: '⏮', title: 'Rewind', action: 'rewind' },
            { id: 'fastForward', icon: '⏭', title: 'Fast Forward', action: 'fastForward' }
        ],
        loopToggle: { id: 'loop', label: 'Loop', action: 'toggleLoop' }
    },

    // Track controls configuration
    trackControls: {
        buttons: [
            { id: 'mute', icon: '🔇', title: 'Mute', action: 'toggleMute' }
        ]
    },

    // Menu configuration
    menu: {
        items: [
            { id: 'load', label: 'Load Projects', hasDropdown: true },
            { id: 'createSong', label: 'Live Recording', disabled: false },
            { id: 'save', label: 'Save', disabled: true },
            { id: 'analyze', label: 'Analyze', disabled: true },
            { id: 'details', label: 'Details', disabled: true },
            { id: 'settings', label: 'Settings', disabled: true },
            { id: 'help', label: 'Help', disabled: true },
            { id: 'license', label: 'License', disabled: true }
        ]
    },

    // Window controls
    windowControls: [
        { id: 'minimize', icon: '🗕', title: 'Minimize', action: 'minimize' },
        { id: 'maximize', icon: '🗖', title: 'Maximize', action: 'maximize' },
        { id: 'close', icon: '🗙', title: 'Close', action: 'close', className: 'close' }
    ],

    // UI Content and Labels
    content: {
        // File info labels
        fileInfo: {
            fileLabel: 'File:',
            bpmLabel: 'BPM:',
            noProjectFile: 'no-project.ass',
            defaultBpm: '120'
        },

        // Time display
        timeDisplay: {
            separator: ' / ',
            timeFormat: 'MM:SS.T'
        },

        // Transport controls
        transport: {
            playButton: '▶',
            pauseButton: '⏸',
            stopButton: '⏹',
            rewindButton: '⏮',
            fastForwardButton: '⏭',
            loopLabel: 'Loop'
        },

        // Track controls
        trackControls: {
            muteButton: '🔇',
            removeButton: '🗑️',
            muteTitle: 'Mute',
            removeTitle: 'Remove Track'
        },

        // Clip repository
        clipRepository: {
            header: 'Clips',
            emptyMessage: 'Select a project to view clips',
            durationSuffix: ' beat',
            durationSuffixPlural: ' beats'
        },

        // Timeline
        timeline: {
            emptyMessage: 'Select a project to view tracks',
            addTrackButton: '+ Add Track',
            newTrackPrefix: 'Track ',
            defaultTrackName: 'New Track'
        },

        // File extensions
        fileExtensions: {
            project: '.ass'
        },

        // Default values
        defaults: {
            defaultDuration: 16,
            minDuration: 8,
            maxDuration: 32,
            defaultSeekAmount: 1
        }
    }
};

// ===== PROJECT DATA =====
export const PROJECT_DATA = {
    // Project A: Piece together a linear sentence
    sentence: {
        id: 'sentence',
        name: 'Piece together a linear sentence',
        bpm: 90,
        timeSignature: '4/4',
        tracks: [
            {
                id: 'sentence-track',
                name: 'Sentence',
                type: 'text',
                clips: []
            }
        ],
        sidebarClips: [
            { id: 'fragment-a', name: 'Fragment A', duration: 1, type: 'text' },
            { id: 'fragment-b', name: 'Fragment B', duration: 2, type: 'text' },
            { id: 'fragment-c', name: 'Fragment C', duration: 1.5, type: 'text' },
            { id: 'fragment-d', name: 'Fragment D', duration: 3, type: 'text' },
            { id: 'fragment-e', name: 'Fragment E', duration: 2.5, type: 'text' },
            { id: 'fragment-f', name: 'Fragment F', duration: 1, type: 'text' },
            { id: 'fragment-g', name: 'Fragment G', duration: 4, type: 'text' },
            { id: 'fragment-h', name: 'Fragment H', duration: 2, type: 'text' },
            { id: 'fragment-i', name: 'Fragment I', duration: 3.5, type: 'text' }
        ],
        description: 'Player must arrange clips in correct order to form the sentence.'
    },

    // Project B: Choose instrument options
    band: {
        id: 'band',
        name: 'Choose instrument options',
        bpm: 110,
        timeSignature: '6/8',
        tracks: [
            {
                id: 'drums',
                name: 'Drums',
                type: 'drums',
                clips: [],
                position: 0

            },
            {
                id: 'bass',
                name: 'Bass',
                type: 'bass',
                clips: [],
                position: 1
            },
            {
                id: 'guitar',
                name: 'Guitar',
                type: 'guitar',
                clips: [],
                position: 2
            },
            {
                id: 'vocals',
                name: 'Vocals',
                type: 'vocals',
                clips: [],
                position: 3
            }
        ],
        sidebarClips: [
            // Drum clips
            { id: 'rock-beat', name: 'Rock Beat', duration: 1, type: 'drums' },
            { id: 'funk-groove', name: 'Funk Groove', duration: 8, type: 'drums' },
            { id: 'jazz-shuffle', name: 'Jazz Shuffle', duration: 6, type: 'drums' },

            // Bass clips
            { id: 'walking-bass', name: 'Walking Bass', duration: 12, type: 'bass' },
            { id: 'synth-bass', name: 'Synth Bass', duration: 3, type: 'bass' },
            { id: 'slap-bass', name: 'Slap Bass', duration: 5, type: 'bass' },

            // Guitar clips
            { id: 'clean-chords', name: 'Clean Chords', duration: 16, type: 'guitar' },
            { id: 'distorted-riff', name: 'Distorted Riff', duration: 2, type: 'guitar' },
            { id: 'arpeggio', name: 'Arpeggio', duration: 7, type: 'guitar' },

            // Vocal clips
            { id: 'lead-take-1', name: 'Lead Take 1', duration: 10, type: 'vocals' },
            { id: 'lead-take-2', name: 'Lead Take 2', duration: 4, type: 'vocals' }
        ],
        description: 'Player chooses one clip per track to build a band arrangement.'
    },

    // Project C: Vince's ambient sandbox
    ambient: {
        id: 'ambient',
        name: 'Vince\'s ambient sandbox',
        bpm: 70,
        timeSignature: '7/8',
        allowTrackManagement: true,
        tracks: [
            {
                id: 'track-1',
                name: 'Track 1',
                type: 'custom',
                clips: [],
                position: 0
            },
            {
                id: 'track-2',
                name: 'Track 2',
                type: 'custom',
                clips: [],
                position: 1
            },
            {
                id: 'track-3',
                name: 'Track 3',
                type: 'custom',
                clips: [],
                position: 2
            },
            {
                id: 'track-4',
                name: 'Track 4',
                type: 'custom',
                clips: [],
                position: 3
            },
        ],
        sidebarClips: [
            // Ambient clips
            { id: 'ambient-pad', name: 'Ambient Pad', duration: 16, type: 'ambient' },
            { id: 'tape-loop', name: 'Tape Loop', duration: 12, type: 'ambient' },

            // Guitar clips
            { id: 'guitar-phrase-1', name: 'Guitar Phrase 1', duration: 5, type: 'guitar' },
            { id: 'guitar-phrase-2', name: 'Guitar Phrase 2', duration: 8, type: 'guitar' },

            // Field recording clips
            { id: 'birds', name: 'Birds', duration: 14, type: 'field' },
            { id: 'rain', name: 'Rain', duration: 20, type: 'field' },
            { id: 'street-noise', name: 'Street Noise', duration: 3, type: 'field' },

            // Bass clips
            { id: 'walking-bass', name: 'Walking Bass', duration: 7, type: 'bass' },
            { id: 'electric-bass', name: 'Electric Bass', duration: 11, type: 'bass' },
            { id: 'synth-bass', name: 'Synth Bass', duration: 6, type: 'bass' },

            // Extra clips
            { id: 'synth-texture', name: 'Synth Texture', duration: 18, type: 'synth' },
            { id: 'perc-loop', name: 'Perc Loop', duration: 1, type: 'percussion' }
        ],
        description: 'Player can freely add/remove tracks and clips, move and resize as desired.'
    },

    // Project D: THE SONG
    song: {
        id: 'song',
        name: 'THE SONG',
        bpm: 120,
        timeSignature: '4/4',
        tracks: [
            {
                id: 'track-1',
                name: 'Vince 1',
                type: 'custom',
                clips: [],
                position: 0
            },
            {
                id: 'track-2',
                name: 'Vince 2',
                type: 'custom',
                clips: [],
                position: 1
            },
            {
                id: 'track-3',
                name: 'Vince 3',
                type: 'custom',
                clips: [],
                position: 2
            },
            {
                id: 'track-4',
                name: 'Viola 1',
                type: 'custom',
                clips: [],
                position: 3
            },
            {
                id: 'track-5',
                name: 'Viola 2',
                type: 'custom',
                clips: [],
                position: 4
            },
            {
                id: 'track-6',
                name: 'Viola 3',
                type: 'custom',
                clips: [],
                position: 5
            },
        ],
        sidebarClips: [
            // Unrecorded Vince clips - these need to be recorded first
            { id: 'vince-recording-1', name: 'Vince Recording 1', duration: null, type: 'vince', needsRecording: true },
            { id: 'vince-recording-2', name: 'Vince Recording 2', duration: null, type: 'vince', needsRecording: true },
            { id: 'vince-recording-3', name: 'Vince Recording 3', duration: null, type: 'vince', needsRecording: true },

            // Viola clips - 9 fragments
            { id: 'viola-fragment-1', name: 'Viola Fragment 1', duration: 2, type: 'viola' },
            { id: 'viola-fragment-2', name: 'Viola Fragment 2', duration: 3, type: 'viola' },
            { id: 'viola-fragment-3', name: 'Viola Fragment 3', duration: 1.5, type: 'viola' },
            { id: 'viola-fragment-4', name: 'Viola Fragment 4', duration: 4, type: 'viola' },
            { id: 'viola-fragment-5', name: 'Viola Fragment 5', duration: 2.5, type: 'viola' },
            { id: 'viola-fragment-6', name: 'Viola Fragment 6', duration: 3.5, type: 'viola' },
            { id: 'viola-fragment-7', name: 'Viola Fragment 7', duration: 1, type: 'viola' },
            { id: 'viola-fragment-8', name: 'Viola Fragment 8', duration: 2, type: 'viola' },
            { id: 'viola-fragment-9', name: 'Viola Fragment 9', duration: 3, type: 'viola' },

        ],
        description: 'Arrange clips to create the final song structure.'
    }
};

// ===== RECORDING VARIANTS FOR VINCE CLIPS =====
export const VINCE_RECORDING_VARIANTS = {
    'vince-recording-1': [
        {
            id: 'vince-take-1-major',
            name: 'Vince Take 1 (Major)',
            duration: 4,
            description: 'Bright, uplifting melody in C major'
        },
        {
            id: 'vince-take-1-minor',
            name: 'Vince Take 1 (Minor)',
            duration: 3.5,
            description: 'Melancholic melody in A minor'
        },
        {
            id: 'vince-take-1-blues',
            name: 'Vince Take 1 (Blues)',
            duration: 5,
            description: 'Soulful blues progression'
        }
    ],
    'vince-recording-2': [
        {
            id: 'vince-take-2-harmony',
            name: 'Vince Take 2 (Harmony)',
            duration: 6,
            description: 'Rich harmonic layers with backing vocals'
        },
        {
            id: 'vince-take-2-rhythm',
            name: 'Vince Take 2 (Rhythm)',
            duration: 4.5,
            description: 'Rhythmic vocal patterns with syncopation'
        },
        {
            id: 'vince-take-2-falsetto',
            name: 'Vince Take 2 (Falsetto)',
            duration: 3,
            description: 'High falsetto melody with ethereal quality'
        }
    ],
    'vince-recording-3': [
        {
            id: 'vince-take-3-bridge',
            name: 'Vince Take 3 (Bridge)',
            duration: 7,
            description: 'Building bridge section with dynamic range'
        },
        {
            id: 'vince-take-3-outro',
            name: 'Vince Take 3 (Outro)',
            duration: 8,
            description: 'Epic outro with layered vocals'
        },
        {
            id: 'vince-take-3-acapella',
            name: 'Vince Take 3 (A Capella)',
            duration: 4,
            description: 'Pure vocal performance without accompaniment'
        }
    ]
};

// ===== CLIP CATEGORIES =====
export const CLIP_CATEGORIES = [
    {
        id: 'vocals',
        name: 'Vocals',
        icon: '🎤',
        color: '#ef4444' // red-500
    },
    {
        id: 'drums',
        name: 'Drums',
        icon: '🥁',
        color: '#f59e0b' // amber-500
    },
    {
        id: 'bass',
        name: 'Bass',
        icon: '🎸',
        color: '#10b981' // emerald-500
    },
    {
        id: 'guitar',
        name: 'Guitar',
        icon: '🎹',
        color: '#8b5cf6' // violet-500
    },
    {
        id: 'fx',
        name: 'FX',
        icon: '🔊',
        color: '#06b6d4' // cyan-500
    },
    {
        id: 'ambient',
        name: 'Ambient',
        icon: '🌊',
        color: '#6366f1' // indigo-500
    },
    {
        id: 'field',
        name: 'Field',
        icon: '🌿',
        color: '#84cc16' // lime-500
    },
    {
        id: 'synth',
        name: 'Synth',
        icon: '⚡',
        color: '#f97316' // orange-500
    },
    {
        id: 'percussion',
        name: 'Percussion',
        icon: '🥁',
        color: '#ec4899' // pink-500
    },
    {
        id: 'instrument',
        name: 'Instrument',
        icon: '🎼',
        color: '#14b8a6' // teal-500
    },
    {
        id: 'rhythm',
        name: 'Rhythm',
        icon: '🎵',
        color: '#f43f5e' // rose-500
    },
    {
        id: 'viola',
        name: 'Viola',
        icon: '🎻',
        color: '#a855f7' // purple-500
    },
    {
        id: 'vince',
        name: 'Vince',
        icon: '🎤',
        color: '#dc2626' // red-600
    },
    {
        id: 'text',
        name: 'Text',
        icon: '📝',
        color: '#6b7280' // gray-500
    }
];

// ===== VALIDATION =====
export const validateConfiguration = () => {
    // Validate required configs
    assert(PROJECT_CONFIG, 'PROJECT_CONFIG is required');
    assert(PROJECT_DATA, 'PROJECT_DATA is required');
    assert(CLIP_CATEGORIES, 'CLIP_CATEGORIES is required');

    // Validate all projects
    Object.entries(PROJECT_DATA).forEach(([key, project]) => {
        assert(project.id, `Project ${key} must have an id`);
        assert(project.name, `Project ${key} must have a name`);
        assert(project.bpm, `Project ${key} must have a bpm`);
        assert(project.tracks, `Project ${key} must have tracks`);
        assert(Array.isArray(project.tracks), `Project ${key} tracks must be an array`);

        // Validate all tracks in project
        project.tracks.forEach((track, index) => {
            assert(track.id, `Track ${index} in project ${key} must have an id`);
            assert(track.name, `Track ${index} in project ${key} must have a name`);
            assert(track.type, `Track ${index} in project ${key} must have a type`);
            assert(track.clips, `Track ${index} in project ${key} must have clips`);
            assert(Array.isArray(track.clips), `Track ${index} in project ${key} clips must be an array`);
        });
    });

    // Validate clip categories
    CLIP_CATEGORIES.forEach((category, index) => {
        assert(category.id, `Clip category ${index} must have an id`);
        assert(category.name, `Clip category ${index} must have a name`);
        assert(category.icon, `Clip category ${index} must have an icon`);
        assert(category.color, `Clip category ${index} must have a color`);
    });

    console.log('✅ Configuration validation passed');
};

// ===== UTILITY FUNCTIONS =====
export const getProjectById = (id) => {
    return Object.values(PROJECT_DATA).find(project => project.id === id);
};

export const getCategoryByType = (type) => {
    return CLIP_CATEGORIES.find(category => category.id === type);
};

// ===== TIMELINE CALCULATION UTILITIES =====
export const calculateTimelineLength = (project) => {
    assert(project, 'Project is required for timeline calculation');
    assert(project.bpm, 'Project BPM is required');
    assert(project.timeSignature, 'Project time signature is required');

    // Parse time signature (e.g., '4/4' => { beats: 4, noteValue: 4 })
    const timeSig = parseTimeSignature(project.timeSignature);
    const beatsPerBar = timeSig.beats;

    // Calculate minimum timeline length based on clips
    const maxClipEnd = calculateMaxClipEnd(project);

    // Calculate bars needed
    const barsNeeded = Math.ceil(maxClipEnd / beatsPerBar);

    // Ensure appropriate timeline length based on project type
    const minBars = 16;
    const totalBars = Math.max(minBars, barsNeeded);

    // Calculate total beats
    const totalBeats = totalBars * beatsPerBar;

    // Calculate timeline height in pixels
    const timelineHeight = totalBeats * PROJECT_CONFIG.layout.gridBeatWidth;

    return {
        bars: totalBars,
        beats: totalBeats,
        height: timelineHeight,
        beatsPerBar,
        timeSignature: project.timeSignature
    };
};

const parseTimeSignature = (timeSignature) => {
    assert(typeof timeSignature === 'string', 'Time signature must be a string');
    const match = timeSignature.match(/^(\d+)\/(\d+)$/);
    assert(match, `Invalid time signature: ${timeSignature}. Must be in 'X/Y' format, e.g., '4/4'. No fallback allowed.`);
    return {
        beats: parseInt(match[1], 10),
        noteValue: parseInt(match[2], 10)
    };
};

const calculateMaxClipEnd = (project) => {
    let maxEnd = 0;

    // Check clips in tracks
    project.tracks.forEach(track => {
        track.clips.forEach(clip => {
            const clipEnd = getClipEndTime(clip);
            maxEnd = Math.max(maxEnd, clipEnd);
        });
    });

    // Check sidebar clips for minimum duration
    if (project.sidebarClips) {
        project.sidebarClips.forEach(clip => {
            maxEnd = Math.max(maxEnd, clip.duration);
        });
    }

    return maxEnd;
};

export const formatTimeSignature = (timeSignature) => {
    const parsed = parseTimeSignature(timeSignature);
    return `${parsed.beats}/${parsed.noteValue}`;
};

// Initialize validation on module load
validateConfiguration(); 