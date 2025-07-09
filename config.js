/**
 * Assembly Audio Editor - Configuration
 * Centralized configuration for all project data and settings
 */

import { assert } from './utils.js';

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
        maxTracksVisible: 6
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
            { id: 'solo', icon: '🎧', title: 'Solo', action: 'toggleSolo' },
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
            soloButton: '🎧',
            muteButton: '🔇',
            removeButton: '🗑️',
            soloTitle: 'Solo',
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
            { id: 'the', name: 'The', duration: 0.5, type: 'text' },
            { id: 'quick', name: 'quick', duration: 0.75, type: 'text' },
            { id: 'brown', name: 'brown', duration: 0.5, type: 'text' },
            { id: 'fox', name: 'fox', duration: 0.5, type: 'text' },
            { id: 'jumps', name: 'jumps', duration: 0.75, type: 'text' },
            { id: 'over', name: 'over', duration: 0.5, type: 'text' },
            { id: 'the2', name: 'the', duration: 0.5, type: 'text' },
            { id: 'lazy', name: 'lazy', duration: 0.5, type: 'text' },
            { id: 'dog', name: 'dog', duration: 0.75, type: 'text' }
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
                clips: [] // Start with empty tracks
            },
            {
                id: 'bass',
                name: 'Bass',
                type: 'bass',
                clips: []
            },
            {
                id: 'guitar',
                name: 'Guitar',
                type: 'guitar',
                clips: []
            },
            {
                id: 'vocals',
                name: 'Vocals',
                type: 'vocals',
                clips: []
            }
        ],
        sidebarClips: [
            // Drum clips
            { id: 'rock-beat', name: 'Rock Beat', duration: 2, type: 'drums' },
            { id: 'funk-groove', name: 'Funk Groove', duration: 4, type: 'drums' },
            { id: 'jazz-shuffle', name: 'Jazz Shuffle', duration: 3, type: 'drums' },

            // Bass clips
            { id: 'walking-bass', name: 'Walking Bass', duration: 4, type: 'bass' },
            { id: 'synth-bass', name: 'Synth Bass', duration: 2, type: 'bass' },
            { id: 'slap-bass', name: 'Slap Bass', duration: 3, type: 'bass' },

            // Guitar clips
            { id: 'clean-chords', name: 'Clean Chords', duration: 4, type: 'guitar' },
            { id: 'distorted-riff', name: 'Distorted Riff', duration: 2, type: 'guitar' },
            { id: 'arpeggio', name: 'Arpeggio', duration: 3, type: 'guitar' },

            // Vocal clips
            { id: 'lead-take-1', name: 'Lead Take 1', duration: 4, type: 'vocals' },
            { id: 'lead-take-2', name: 'Lead Take 2', duration: 3, type: 'vocals' }
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
                id: 'background-loop',
                name: 'Background Loop',
                type: 'ambient',
                clips: []
            },
            {
                id: 'vince-guitar',
                name: 'Vince\'s Guitar',
                type: 'guitar',
                clips: []
            },
            {
                id: 'field-recording',
                name: 'Field Recording',
                type: 'field',
                clips: []
            },
            {
                id: 'bass',
                name: 'Bass',
                type: 'bass',
                clips: []
            }
        ],
        sidebarClips: [
            // Ambient clips
            { id: 'ambient-pad', name: 'Ambient Pad', duration: 8, type: 'ambient' },
            { id: 'tape-loop', name: 'Tape Loop', duration: 6, type: 'ambient' },

            // Guitar clips
            { id: 'guitar-phrase-1', name: 'Guitar Phrase 1', duration: 4, type: 'guitar' },
            { id: 'guitar-phrase-2', name: 'Guitar Phrase 2', duration: 3, type: 'guitar' },

            // Field recording clips
            { id: 'birds', name: 'Birds', duration: 6, type: 'field' },
            { id: 'rain', name: 'Rain', duration: 8, type: 'field' },
            { id: 'street-noise', name: 'Street Noise', duration: 4, type: 'field' },

            // Bass clips
            { id: 'walking-bass', name: 'Walking Bass', duration: 4, type: 'bass' },
            { id: 'electric-bass', name: 'Electric Bass', duration: 4, type: 'bass' },
            { id: 'synth-bass', name: 'Synth Bass', duration: 3, type: 'bass' },

            // Extra clips
            { id: 'synth-texture', name: 'Synth Texture', duration: 8, type: 'synth' },
            { id: 'perc-loop', name: 'Perc Loop', duration: 2, type: 'percussion' }
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
                id: 'main-instrument',
                name: 'Main Instrument',
                type: 'instrument',
                clips: []
            },
            {
                id: 'vocals',
                name: 'Vocals',
                type: 'vocals',
                clips: []
            },
            {
                id: 'rhythm-section',
                name: 'Rhythm Section',
                type: 'rhythm',
                clips: []
            },
            {
                id: 'viola-material',
                name: 'Viola Material',
                type: 'viola',
                clips: []
            },
            {
                id: 'bass',
                name: 'Bass',
                type: 'bass',
                clips: []
            }
        ],
        sidebarClips: [
            // Instrument clips
            { id: 'piano-intro', name: 'Piano Intro', duration: 4, type: 'instrument' },
            { id: 'guitar-verse', name: 'Guitar Verse', duration: 3, type: 'instrument' },

            // Vocal clips
            { id: 'vince-take', name: 'Vince\'s Take', duration: 4, type: 'vocals' },
            { id: 'viola-take', name: 'Viola\'s Take', duration: 3, type: 'vocals' },

            // Rhythm clips
            { id: 'drum-groove', name: 'Drum Groove', duration: 4, type: 'rhythm' },
            { id: 'percussion', name: 'Percussion', duration: 2, type: 'rhythm' },

            // Viola clips
            { id: 'viola-melody', name: 'Viola Melody', duration: 4, type: 'viola' },
            { id: 'viola-harmony', name: 'Viola Harmony', duration: 3, type: 'viola' },

            // Bass clips
            { id: 'walking-bass', name: 'Walking Bass', duration: 4, type: 'bass' },
            { id: 'electric-bass', name: 'Electric Bass', duration: 4, type: 'bass' },
            { id: 'synth-bass', name: 'Synth Bass', duration: 3, type: 'bass' }
        ],
        description: 'Arrange clips to create the final song structure.'
    }
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
        id: 'text',
        name: 'Text',
        icon: '📝',
        color: '#6b7280' // gray-500
    }
];

// ===== VALIDATION =====
export const validateConfiguration = () => {
    // Validate required configuration sections
    assert(PROJECT_CONFIG, 'PROJECT_CONFIG is required');
    assert(PROJECT_DATA, 'PROJECT_DATA is required');
    assert(CLIP_CATEGORIES, 'CLIP_CATEGORIES is required');

    // Validate project data structure
    Object.entries(PROJECT_DATA).forEach(([key, project]) => {
        assert(project.id, `Project ${key} must have an id`);
        assert(project.name, `Project ${key} must have a name`);
        assert(project.bpm, `Project ${key} must have a bpm`);
        assert(project.tracks, `Project ${key} must have tracks`);
        assert(Array.isArray(project.tracks), `Project ${key} tracks must be an array`);

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

export const getCategoryById = (id) => {
    return CLIP_CATEGORIES.find(category => category.id === id);
};

export const getCategoryByType = (type) => {
    return CLIP_CATEGORIES.find(category => category.id === type);
};

export const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatBeatTime = (beats, bpm) => {
    const totalSeconds = (beats / bpm) * 60;
    return formatTime(totalSeconds);
};

// Initialize validation on module load
validateConfiguration(); 