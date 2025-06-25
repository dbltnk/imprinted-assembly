# Assembly Prototype Development Plan

## Overview
This prototype is a UI mockup for the "Assembly" multi-track audio editor game. It is sandbox-focused, with no audio playback or file handling. The UI is inspired by DAWs (Ableton, Logic, Garageband) but is simple, accessible, and game-like. The layout is:
- **Left sidebar:** Clip repository (with categories and icons), playback controls at the top
- **Main timeline (right):** Multi-track timeline with snapping, time ruler, and track controls

---

## 1. General UI Structure
- **Dark theme** with a distinct accent color (not WaveEdit's orange)
- **No pan/volume controls** or wiggly volume elements
- **Icons** used liberally, especially for controls and clip categories
- **Responsive only for wide screens** (no mobile/responsive work)
- **Logging system must remain intact**

---

## 2. Top Bar/Menu
- **Title:** "Assembly" (top left)
- **Menu bar:**
  - **Load ▼** (dropdown to select between 4 projects/puzzles)
    - a) Piece together a linear sentence
    - b) Choose instrument options
    - c) Vince's ambient sandbox (only here: add/remove tracks)
    - d) THE SONG (content only)
  - Other menu items (Save, Analyze, etc.) are placeholders only (no functionality)

---

## 3. Left Sidebar
- **Playback controls at the top:**
  - Play (▶), Pause (⏸), Stop (⏹), Rewind (⏮), Fast Forward (⏭), Loop toggle
  - Use icons from the provided list
- **Clip repository below controls:**
  - Clips grouped by category (e.g., Vocals, Drums, Bass, FX, etc.)
  - Each group has an icon and label
  - Clips are draggable into the timeline
  - No tabs, just visually grouped
- **Sidebar is fixed width**

---

## 4. Main Timeline Area
- **Tracks:**
  - At least 6 visible at once (vertical scroll if more)
  - Each track:
    - Name (editable by user)
    - Mute (icon toggle, left)
    - Solo (icon toggle, left)
    - Track color/accent
    - List of clips (blocks)
  - Add/remove track only in puzzle (c)
- **Timeline:**
  - Time ruler at the top (beats/bars, shows BPM)
  - Visible snapping grid (vertical lines)
  - Clips:
    - Draggable within/between tracks
    - **Resizable by dragging left/right edges** (resize by dragging edges, move by dragging center)
    - Cannot overlap in a track
    - Snap to grid
- **BPM display** (top right of timeline area)

---

## 5. Interactions
- **Drag and drop:**
  - Clips from sidebar to timeline
  - Clips within/between tracks
- **Rename tracks:**
  - Click track name to edit
- **Mute/Solo:**
  - Toggle icons per track
- **Add/Remove track:**
  - Only in puzzle (c), via "+ Add Track" button at bottom of track list

---

## 6. Visual Style
- **Dark background**
- **Accent color**: Choose something distinct (e.g., teal, blue, green)
- **Track colors:** Subtle, not too saturated
- **Icons:** Use provided list and emojis where needed
- **Snapping grid:** Subtle but visible

---

## 7. Out of Scope
- No audio playback or waveform rendering
- No file loading/saving
- No puzzle/mode switching UI (just "Load" dropdown)
- No volume/pan controls
- No advanced animations or tooltips (keep it basic)

---

## 8. Implementation Steps
1. **Set up base HTML structure:**
   - Top bar, sidebar, main timeline area
2. **Implement menu bar and Load dropdown**
3. **Sidebar:**
   - Playback controls (icons)
   - Clip repository with categories and icons
4. **Timeline area:**
   - Track list (with scroll)
   - Track controls (mute, solo, rename)
   - Time ruler and snapping grid
   - Draggable/resizable clips
   - BPM display
5. **Add/remove track logic (only in puzzle c)**
6. **Styling:**
   - Dark theme, accent color, icons, grid
7. **Logging:**
   - Ensure logging system is untouched
8. **Testing:**
   - Check all UI interactions, drag/drop, renaming, toggles

---

## 9. Icons Reference
- Use the provided icons and emojis for all controls and categories
- Example: ▶️ ⏸ ⏹ ⏮ ⏭ 🔁 (loop), 🎤 (vocals), 🥁 (drums), 🎸 (guitar), etc.

---

## 10. Notes
- Keep code DRY and well-commented
- Use asserts to document assumptions
- No default configs—fail hard if config missing
- Optimize for readability and beginner-friendliness 

---

## 11. Project Data: Tracks, Clips, and Metadata

### a) Piece together a linear sentence
- **BPM:** 90
- **Tracks:**
  - "Sentence"
- **Clips:**
  - "The"
  - "quick"
  - "brown"
  - "fox"
  - "jumps"
  - "over"
  - "the"
  - "lazy"
  - "dog"
- **Notes:** Player must arrange clips in correct order to form the sentence.

### b) Choose out of 2-4 options for each instrument in a band
- **BPM:** 110
- **Tracks:**
  - "Drums"
  - "Bass"
  - "Guitar"
  - "Vocals"
- **Clips:**
  - Drums: "Rock Beat", "Funk Groove", "Jazz Shuffle"
  - Bass: "Walking Bass", "Synth Bass", "Slap Bass"
  - Guitar: "Clean Chords", "Distorted Riff", "Arpeggio"
  - Vocals: "Lead Take 1", "Lead Take 2"
- **Notes:** Player chooses one clip per track to build a band arrangement.

### c) Vince's ambient sandbox (freeform)
- **BPM:** 70
- **Tracks:**
  - "Background Loop"
  - "Vince's Guitar"
  - "Field Recording"
  - (Player can add/remove tracks)
- **Clips:**
  - Background Loop: "Ambient Pad", "Tape Loop"
  - Vince's Guitar: "Guitar Phrase 1", "Guitar Phrase 2"
  - Field Recording: "Birds", "Rain", "Street Noise"
  - Extra: "Synth Texture", "Perc Loop"
- **Notes:** Player can freely add/remove tracks and clips, move and resize as desired.

### d) THE SONG (content only)
- **BPM:** 120
- **Tracks:**
  - "Main Instrument"
  - "Vocals"
  - "Rhythm Section"
  - "Viola Material"
  - "Bass"
- **Clips:**
  - Main Instrument: "Piano Intro", "Guitar Verse"
  - Vocals: "Vince's Take", "Viola's Take"
  - Rhythm Section: "Drum Groove", "Percussion"
  - Viola Material: "Viola Melody", "Viola Harmony"
  - Bass: "Electric Bass", "Synth Bass"
- **Notes:** No special mechanics, just content arrangement. 