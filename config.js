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
        maxTracksVisible: 5,
        maxTracks: 5,
        vincesNotesHeight: 200,
        assetPreviewHeight: 300,
        rightWindowsWidth: 320
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
        items: []
    },

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
    // Single project with 4 specific slots
    main: {
        id: 'main',
        name: 'Assembly Project',
        bpm: 120,
        timeSignature: '4/4',
        maxActiveTracks: 4,
        tracks: [
            {
                id: 'melody-track',
                name: 'Melody',
                type: 'melody',
                clips: [],
                position: 0
            },
            {
                id: 'instrument-track',
                name: 'Instrument',
                type: 'instrument',
                clips: [],
                position: 1
            },
            {
                id: 'lyrics-track',
                name: 'Lyrics',
                type: 'lyrics',
                clips: [],
                position: 2
            },
            {
                id: 'visuals-track',
                name: 'Visuals',
                type: 'visuals',
                clips: [],
                position: 3
            }
        ],
        sidebarClips: [
            // Melody options (3)
            {
                id: 'melody-1',
                name: 'Uplifting Melody',
                duration: 8,
                type: 'melody',
                vincesNotes: "I wrote this one the morning after Dad called. Couldn't sleep, so I sat at the piano until sunrise. Each note climbs higher, like I'm trying to reach something just out of grasp. Maybe hope? I don't know. But it feels right."
            },
            {
                id: 'melody-2',
                name: 'Melancholic Theme',
                duration: 9,
                type: 'melody',
                vincesNotes: "This melody haunts me. It showed up in a dream last week and I've been chasing it ever since. There's something unfinished about it, something that aches. Sometimes I wonder if all my best work comes from the parts of me I'm afraid to look at."
            },
            {
                id: 'melody-3',
                name: 'Rhythmic Hook',
                duration: 7,
                type: 'melody',
                vincesNotes: "Finally! A hook that doesn't overthink itself. I've been so stuck in my own head lately, afraid nothing I make matters. But this one? It's simple, confident. The kind of thing people hum without realizing. Maybe I should trust the simple stuff more."
            },

            // Instrument options (3)
            {
                id: 'instrument-1',
                name: 'Piano Accompaniment',
                duration: 9,
                type: 'instrument',
                vincesNotes: "Piano is home for me. When everything else feels fake or forced, I come back to these keys. This arrangement reminds me of sitting in my grandmother's living room, how the sound would fill the whole house. I wish she could hear what I'm making now.",
                effects: [
                    { type: 'reverb', value: 50, label: 'Reverb' }
                ]
            },
            {
                id: 'instrument-2',
                name: 'Electric Guitar',
                duration: 7,
                type: 'instrument',
                vincesNotes: "I'm scared this is too aggressive. Too loud. But then I remember being seventeen and feeling invisible. This guitar screams in all the ways I never could. Sometimes the music has to be braver than you are. Sometimes it has to fight for you.",
                effects: [
                    { type: 'reverb', value: 30, label: 'Reverb' }
                ]
            },
            {
                id: 'instrument-3',
                name: 'Synth Pad',
                duration: 8,
                type: 'instrument',
                vincesNotes: "Recorded this at 3 AM when I couldn't turn my brain off. There's so much space in these sounds. It's like floating. Maya says I use ambient textures to avoid being direct, and maybe she's right. But there's honesty in the quiet too, isn't there?",
                effects: [
                    { type: 'reverb', value: 70, label: 'Reverb' }
                ]
            },

            // Lyrics options (3)
            {
                id: 'lyrics-1',
                name: 'Hope & Dreams',
                duration: 8,
                type: 'lyrics',
                text: 'When the night is darkest, we find our light within. Every step forward is a victory.',
                vincesNotes: "I'm embarrassed by how earnest these words are. Part of me wants to hide behind irony, make it clever instead of vulnerable. But I wrote this for myself on the bad days, and if someone else needs to hear it too... maybe that's enough. Maybe it's okay to hope out loud.",
                effects: [
                    { type: 'vocoder', value: 40, label: 'Vocoder' }
                ]
            },
            {
                id: 'lyrics-2',
                name: 'Lost Love',
                duration: 9,
                type: 'lyrics',
                text: 'Memory fades like photographs in sunlight. What we had lives on in silent echoes.',
                vincesNotes: "It's been two years and I still think about her. Not every day anymore, but in the quiet moments. These words feel pretentious when I read them back, but they're the closest I can get to that specific kind of loss. The kind where the goodbye was gentle but still breaks you.",
                effects: [
                    { type: 'vocoder', value: 20, label: 'Vocoder' }
                ]
            },
            {
                id: 'lyrics-3',
                name: 'Call to Action',
                duration: 7,
                type: 'lyrics',
                text: 'Stand up, reach out, make some noise! This is our moment, this is our voice!',
                vincesNotes: "This is the version of me I wish I could be all the time. Confident. Unafraid. I wrote this imagining a stadium full of people, all of us shouting together. Sometimes you have to write the energy you need into existence. Fake it till you make it, right?",
                effects: [
                    { type: 'vocoder', value: 60, label: 'Vocoder' }
                ]
            },

            // Visuals options (3)
            {
                id: 'visual-1',
                name: 'Sunrise Sequence',
                duration: 8,
                type: 'visuals',
                visualType: 'video',
                placeholder: '#ff6b35',
                vincesNotes: "Shot this footage on a morning I almost gave up. I'd sent out fifty demos and heard nothing back. Then I saw this sunrise and something clicked. There's this Japanese concept, 'mono no aware' - the beauty of impermanence. That's what this is."
            },
            {
                id: 'visual-2',
                name: 'Urban Nights',
                duration: 7,
                type: 'visuals',
                visualType: 'video',
                placeholder: '#4a5568',
                vincesNotes: "I feel most alive in cities at night. All these people, each carrying their own stories, their own struggles. The rain makes everything look like a painting. Sometimes I walk for hours just watching, trying to understand why beauty and loneliness feel so connected."
            },
            {
                id: 'visual-3',
                name: 'Concert Energy',
                duration: 9,
                type: 'visuals',
                visualType: 'video',
                placeholder: '#e53e3e',
                vincesNotes: "This is the dream. This exact energy. Everyone moving as one, losing themselves in the music. I've only played for small crowds, maybe thirty people max. But I close my eyes and imagine this. The lights, the roar, the connection. One day. It has to be one day."
            }
        ],
        description: 'Assemble your song by selecting one asset from each category.'
    },

    // Project B: Choose instrument options
    band: {
        id: 'band',
        name: 'Choose instrument options',
        bpm: 110,
        timeSignature: '6/8',
        maxActiveTracks: 4,
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

            // Bass clips
            { id: 'walking-bass', name: 'Walking Bass', duration: 12, type: 'bass' },
            { id: 'synth-bass', name: 'Synth Bass', duration: 3, type: 'bass' },

            // Guitar clips
            { id: 'clean-chords', name: 'Clean Chords', duration: 16, type: 'guitar' },
            { id: 'distorted-riff', name: 'Distorted Riff', duration: 2, type: 'guitar' },

            // Vocal clips
            { id: 'lead-take-1', name: 'Lead Take 1', duration: 10, type: 'vocals' },
            { id: 'lead-take-2', name: 'Lead Take 2', duration: 4, type: 'vocals' },

            // Lyrics
            { id: 'verse-1', name: 'Verse 1', duration: 8, type: 'lyrics', text: 'We are the rhythm, we are the sound' },
            { id: 'chorus-1', name: 'Chorus Hook', duration: 4, type: 'lyrics', text: 'Feel the beat inside your soul' },
            { id: 'bridge-1', name: 'Bridge', duration: 6, type: 'lyrics', text: 'Break it down now, take it slow' },

            // Visuals
            { id: 'stage-lights', name: 'Stage Lights', duration: 12, type: 'visuals', visualType: 'video', placeholder: '#ef4444' },
            { id: 'band-photo', name: 'Band Photo', duration: 8, type: 'visuals', visualType: 'image', placeholder: '#f59e0b' },
            { id: 'concert-crowd', name: 'Concert Crowd', duration: 10, type: 'visuals', visualType: 'video', placeholder: '#10b981' }
        ],
        description: 'Player chooses one clip per track to build a band arrangement.'
    },

    // Project C: Vince's ambient sandbox
    ambient: {
        id: 'ambient',
        name: 'Vince\'s ambient sandbox',
        bpm: 70,
        timeSignature: '7/8',
        maxActiveTracks: 5,
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
            {
                id: 'track-5',
                name: 'Track 5',
                type: 'custom',
                clips: [],
                position: 4
            }
        ],
        sidebarClips: [
            // Ambient clips
            { id: 'ambient-pad', name: 'Ambient Pad', duration: 16, type: 'ambient' },
            { id: 'tape-loop', name: 'Tape Loop', duration: 12, type: 'ambient' },
            { id: 'synth-texture', name: 'Synth Texture', duration: 18, type: 'synth' },

            // Guitar clips
            { id: 'guitar-phrase-1', name: 'Guitar Phrase 1', duration: 5, type: 'guitar' },
            { id: 'guitar-phrase-2', name: 'Guitar Phrase 2', duration: 8, type: 'guitar' },

            // Field recording clips
            { id: 'birds', name: 'Birds', duration: 14, type: 'field' },
            { id: 'rain', name: 'Rain', duration: 20, type: 'field' },

            // Lyrics
            { id: 'spoken-word-1', name: 'Spoken Word 1', duration: 9, type: 'lyrics', text: 'Silence speaks louder than words ever could' },
            { id: 'whisper-1', name: 'Whispered Poetry', duration: 7, type: 'lyrics', text: 'In the space between breaths, we find meaning' },
            { id: 'ambient-vocals', name: 'Ambient Vocals', duration: 15, type: 'lyrics', text: 'Ooooh... ahhhhh... hmmmm...' },

            // Visuals
            { id: 'sunset-time', name: 'Sunset Timelapse', duration: 12, type: 'visuals', visualType: 'video', placeholder: '#fb923c' },
            { id: 'abstract-waves', name: 'Abstract Waves', duration: 8, type: 'visuals', visualType: 'image', placeholder: '#3b82f6' },
            { id: 'city-lights', name: 'City Lights', duration: 10, type: 'visuals', visualType: 'video', placeholder: '#fbbf24' },
            { id: 'nature-scene', name: 'Nature Scene', duration: 14, type: 'visuals', visualType: 'image', placeholder: '#84cc16' }
        ],
        description: 'Player can freely add/remove tracks and clips, move and resize as desired.'
    },

    // Project D: THE SONG
    song: {
        id: 'song',
        name: 'THE SONG',
        bpm: 120,
        timeSignature: '4/4',
        maxActiveTracks: 5,
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
                id: 'track-5',
                name: 'Viola 3',
                type: 'custom',
                clips: [],
                position: 4
            }
        ],
        sidebarClips: [
            // Vince clips
            { id: 'vince-recording-1', name: 'Vince Recording 1', duration: null, type: 'vince', needsRecording: true },
            { id: 'vince-recording-2', name: 'Vince Recording 2', duration: null, type: 'vince', needsRecording: true },

            // Viola clips
            { id: 'viola-fragment-1', name: 'Viola Fragment 1', duration: 2, type: 'viola' },
            { id: 'viola-fragment-2', name: 'Viola Fragment 2', duration: 3, type: 'viola' },
            { id: 'viola-fragment-3', name: 'Viola Fragment 3', duration: 1.5, type: 'viola' },

            // Lyrics
            { id: 'song-verse', name: 'Verse Lines', duration: 8, type: 'lyrics', text: 'When the music fades and silence falls, we remember why we started' },
            { id: 'song-chorus', name: 'Chorus', duration: 6, type: 'lyrics', text: 'This is the song that never ends, it goes on and on my friend' },
            { id: 'song-outro', name: 'Final Words', duration: 4, type: 'lyrics', text: 'And in the end, the love you take is equal to the love you make' },

            // Visuals
            { id: 'album-art', name: 'Album Art', duration: 10, type: 'visuals', visualType: 'image', placeholder: '#a855f7' },
            { id: 'music-video', name: 'Music Video Clip', duration: 12, type: 'visuals', visualType: 'video', placeholder: '#ec4899' },
            { id: 'vinyl-spin', name: 'Vinyl Spinning', duration: 16, type: 'visuals', visualType: 'video', placeholder: '#14b8a6' }
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

// ===== VINCE'S NOTES TEXT CONTENT =====
export const VINCES_NOTES_TEXTS = [
    {
        id: 'text-1',
        content: "Music isn't about perfection. It's about capturing a moment, a feeling, something raw. When Viola plays, I hear colors. When the bass drops, I feel the room shake. That's what we're chasing here. Not a clean mix. Not a radio hit. Just truth."
    },
    {
        id: 'text-2',
        content: "Viola keeps saying we need more structure. More rules. But rules kill creativity. You know what happens when you follow all the rules? You get elevator music. Safe. Boring. Forgettable. I'd rather make something messy and real than polished and dead."
    },
    {
        id: 'text-3',
        content: "This track needs space. Room to breathe. Too many producers fill every second with sound. They're afraid of silence. But silence is part of the music. It's the canvas. Without it, you're just throwing paint at a wall and calling it art."
    }
];

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
    },
    {
        id: 'lyrics',
        name: 'Lyrics',
        icon: '📝',
        color: '#fbbf24' // amber-400
    },
    {
        id: 'visuals',
        name: 'Visuals',
        icon: '🖼️',
        color: '#c084fc' // purple-400
    },
    {
        id: 'melody',
        name: 'Melody',
        icon: '🎵',
        color: '#38bdf8' // sky-400
    },
    {
        id: 'instrument',
        name: 'Instrument',
        icon: '🎸',
        color: '#f59e0b' // amber-500
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

    // Timeline is fixed at 2 bars
    const totalBars = 2;

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