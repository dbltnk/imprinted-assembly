# Multi-Asset Assembly - Design & Implementation Doc

## Overview
Expanding Assembly from audio-only to multi-media editor supporting audio, lyrics, and visuals.

---

## 1. Layout Restructure

### Main Frame Changes
- **Current:** Timeline | VU Meter
- **New:** Timeline | VU Meter | Two stacked windows (Vince's Notes above, Asset Preview below)

### Track Grid Changes
- **Max tracks:** 3-5 tracks (variable per project)
- **Disabled tracks:** Show grayed out when < 5 tracks used
- **No vertical scrolling:** All tracks fit on one screen
- **One clip per track:** New clip replaces existing on drop

### Project Track Assignments
- `sentence`: 3 tracks
- `band`: 4 tracks  
- `ambient`: 5 tracks
- `song`: 5 tracks

---

## 2. Vince's Notes Window

### Location
Top-right window, above Asset Preview, same width as VU meter + new windows combined.

### Behavior
- Typing animation: word-by-word
- Speed: complete text in ~10 seconds
- Shows one text per session (randomly selected on project load)
- Text restarts/resets when switching projects

### Sample Texts (2-3 paragraphs each)

**Text 1 - The Process**
"Music isn't about perfection. It's about capturing a moment, a feeling, something raw. When Viola plays, I hear colors. When the bass drops, I feel the room shake. That's what we're chasing here. Not a clean mix. Not a radio hit. Just truth."

**Text 2 - The Collaboration**
"Viola keeps saying we need more structure. More rules. But rules kill creativity. You know what happens when you follow all the rules? You get elevator music. Safe. Boring. Forgettable. I'd rather make something messy and real than polished and dead."

**Text 3 - The Vision**
"This track needs space. Room to breathe. Too many producers fill every second with sound. They're afraid of silence. But silence is part of the music. It's the canvas. Without it, you're just throwing paint at a wall and calling it art."

### Technical Notes
- Fixed height window with scrollable content if text overflows
- Monospace or handwriting-style font
- Dark background, light text
- Header: "Vince's Notes" with 📝 emoji

---

## 3. Asset Preview Window

### Location
Bottom-right window, below Vince's Notes, same width as VU meter + new windows combined.

### Selection Behavior
- Click any asset in sidebar OR on timeline to select
- Only one asset selected at a time
- Selection persists until another asset clicked

### Empty State
"Select an asset to preview it here"

### Preview Modes

**Audio Clips:**
- Stylized waveform visualization
- Use colored bars/blocks representing audio amplitude
- Color matches clip type category

**Lyrics:**
- Large, nicely rendered text
- Centered, readable font
- Word-wrap, good typography
- Consider: serif font, adequate line spacing

**Visuals:**
- Placeholder images (colored gradients or simple shapes)
- Maintain aspect ratio
- Scale to fit window

### Technical Notes
- Header: "Asset Preview" with 👁️ emoji
- Background changes based on asset type
- Smooth transition when switching assets

---

## 4. Sidebar Asset Types

### Organization
Three sections with headers and emoji icons:

**🎵 Audio Clips**
- 2-4 per project
- Existing audio types (drums, bass, guitar, vocals, etc.)

**📝 Lyrics**
- 2-4 per project
- Sample lyric snippets with durations
- Examples: "Verse 1", "Chorus Hook", "Bridge Melody"

**🖼️ Visuals**  
- 2-4 per project
- Image/video placeholders with durations
- Examples: "Sunset Timelapse", "City Lights", "Abstract Waves"

### Asset Properties
All assets share:
- `id`: unique identifier
- `name`: display name
- `duration`: length in beats
- `type`: category (audio/lyrics/visuals sub-type)

### Sample Durations
Match existing clip range: 1-20 beats

### Example Lyrics Assets
```javascript
{ id: 'verse-1', name: 'Verse 1', duration: 8, type: 'lyrics', text: '...' }
{ id: 'chorus-1', name: 'Chorus Hook', duration: 4, type: 'lyrics', text: '...' }
{ id: 'bridge-1', name: 'Bridge', duration: 6, type: 'lyrics', text: '...' }
```

### Example Visual Assets
```javascript
{ id: 'visual-1', name: 'Sunset Timelapse', duration: 12, type: 'visuals', visualType: 'video' }
{ id: 'visual-2', name: 'Abstract Waves', duration: 8, type: 'visuals', visualType: 'image' }
{ id: 'visual-3', name: 'City Lights', duration: 10, type: 'visuals', visualType: 'video' }
```

---

## 5. Track Changes

### Clip Restrictions
- **One clip maximum per track**
- Drop behavior: replace existing clip (no validation, just swap)
- No collision detection needed

### No Vertical Scrolling
- All tracks visible at once (3-5 tracks)
- Timeline remains horizontally scrollable

### Track Type Flexibility
- Tracks now accept any asset type (audio/lyrics/visuals)
- Track names indicate content expectation (e.g., "Lyrics Track", "Visual Background")
- Validation logic may still apply per project

---

## 6. Effect Knobs

### Location
Track header, to the right of mute/solo buttons

### Frequency
- 50% of tracks have 1-2 knobs
- Assigned per track in project config

### Knob Types
- Reverb
- Echo/Delay
- Hi-Pass Filter
- Lo-Pass Filter  
- Distortion
- Chorus

### Visual Design
- Small circular knob (30-40px diameter)
- Indicator line showing position
- Label beneath (abbreviated: "Rev", "Echo", "Hi", "Lo")
- Interactive: click-drag to rotate

### Behavior
- Visual only (no audio processing)
- State persists per track
- Default position: 12 o'clock (50%)

### Technical Notes
- Store knob values (0-100) in track state
- Render as SVG or CSS transform rotation
- Tooltip shows full effect name on hover

---

## 7. Record Song Feature

### UI Changes
- **Remove:** "Live Recording" menu item
- **Add:** "Record Song" button in top-right of menu bar
- Position: right of "License"
- Style: red background, red recording icon (⏺)

### Fullscreen Mode
When clicked:
- Overlay entire app with opaque black background
- Show close button (X) in top-right corner
- Display visualization area (centered)
- Display lyrics below visualization
- Continue audio playback if currently playing

### Visualization Area
- Placeholder: animated bars/waveform
- Use project BPM to sync animation
- Abstract shapes that pulse/react
- Color scheme: match current project theme

### Lyrics Display
- Show currently "active" lyrics based on playhead position
- Animate: fade in/out, slide up, or typewriter effect
- Large, readable font
- Centered below visualization
- If no lyrics on timeline: show "..."

### Exit Behavior
- Click X button to close
- ESC key to close
- Return to normal view, maintain playback state

### Technical Notes
- Create modal overlay component
- Use CSS `position: fixed` with `z-index: 9999`
- Animation frame synced to playback time
- Lyrics timing based on clip startTime + duration on timeline

---

## 8. Implementation Phases

### Phase 1: Layout & Structure
1. Update `PROJECT_CONFIG` layout constants
2. Modify track limits per project (3-5 tracks)
3. Add Vince's Notes and Asset Preview containers to HTML
4. Adjust CSS grid for new layout
5. Remove horizontal track scrolling

### Phase 2: New Asset Types
1. Add lyrics/visuals data to `config.js`
2. Update sidebar component to show three sections
3. Create asset type icons and styling
4. Implement drag-drop for new asset types

### Phase 3: Windows Implementation
1. Create Vince's Notes component with typing animation
2. Create Asset Preview component with mode switching
3. Implement asset selection system
4. Connect preview to sidebar/timeline clicks

### Phase 4: Track Changes
1. Implement one-clip-per-track replacement logic
2. Remove track scrolling code
3. Add disabled track states for unused tracks

### Phase 5: Effect Knobs
1. Add knob configuration to project data
2. Create Knob UI component (SVG/CSS)
3. Add knobs to track headers
4. Implement click-drag rotation interaction
5. Store knob state in track data

### Phase 6: Record Song Feature
1. Remove "Live Recording" menu item from config
2. Add "Record Song" button to header
3. Create fullscreen overlay component
4. Implement visualization placeholder
5. Add lyrics display with animation
6. Wire up close behavior

---

## 9. Technical Considerations

### Performance
- Typing animation uses `requestAnimationFrame` for smoothness
- Preview window updates only on selection change
- Knob rotation uses CSS transforms (GPU accelerated)

### State Management
- Add `selectedAssetId` to app state
- Track knob values stored in track objects
- Record mode state (boolean flag)

### Data Structure Updates
```javascript
// Track with knobs
{
  id: 'track-1',
  name: 'Bass Track',
  type: 'bass',
  clips: [],
  effects: [
    { type: 'reverb', value: 50 },
    { type: 'echo', value: 30 }
  ]
}

// Lyrics asset
{
  id: 'lyrics-1',
  name: 'Verse 1',
  duration: 8,
  type: 'lyrics',
  text: 'Sample lyric text here...'
}

// Visual asset
{
  id: 'visual-1',
  name: 'Sunset',
  duration: 12,
  type: 'visuals',
  visualType: 'video',
  placeholder: '#FF6B35' // Color for placeholder
}
```

### Validation Rules
- One clip per track: enforced in drop handler
- Asset type restrictions per project: maintain existing validation
- Track count: enforce min 3, max 5 per project

---

## 10. Testing Checklist

- [ ] All projects load with correct track count (3-5)
- [ ] Vince's Notes animates on project load
- [ ] Asset Preview shows correct mode for audio/lyrics/visuals
- [ ] Sidebar organized into three sections
- [ ] Drag-drop works for all asset types
- [ ] One clip per track replacement works
- [ ] No track scrolling (all visible on screen)
- [ ] Effect knobs appear on 50% of tracks
- [ ] Knobs rotate on drag
- [ ] Record Song button appears in header
- [ ] Fullscreen mode shows visualization + lyrics
- [ ] ESC and X button close fullscreen mode
- [ ] Playback continues in fullscreen mode

---

**End of Document**

