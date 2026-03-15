## Redesign Gossip Composer Card

### What changes

**1. Icon-only toolbar** — Replace the tag input, hide-from input, followers-only button, and burner button with a compact icon toolbar row beneath the textarea. Each icon toggles open its respective panel:

add hover labels to explain what they do 

- `AtSign` — Tag users (expands tag search input + chips)
- `Ghost` — Hide from users (expands hide search input + chips)  
- `UserCheck` — Followers only (toggle, no panel)
- `Timer` — Burner mode (expands duration picker)

**2. Burner duration options** — Replace the single "24h Burner" toggle with selectable durations:

- 12 hours
- 1 day (24h)
- 1 week

When the Timer icon is tapped, a small row of duration chips appears. The selected duration gets a glow effect. Tapping again deselects (no burner).

**3. Composer card redesign** — Cleaner, more compact layout:

- "Posting as" alias label at top
- Textarea for content
- Icon toolbar row (tag, hide, followers, burner) with active state indicators (dots/badges)
- Expandable panels appear below the toolbar when an icon is active
- Post button stays at bottom-right

### Technical details

**File**: `src/pages/Gossip.tsx`

- Add new state: `burnerDuration` (`"12h" | "24h" | "1w" | null`) replacing `isBurner` boolean
- Add `activePanel` state (`"tag" | "hide" | "burner" | null`) to toggle which panel is expanded
- `isFollowersOnly` stays as a simple toggle (no panel)
- Update `handlePost` to compute `expires_at` based on `burnerDuration`:
  - `12h` → 12 hours
  - `24h` → 24 hours  
  - `1w` → 7 days
- Icon toolbar: 4 icons in a row with tooltips, active icons get colored backgrounds/glows
- Selected tags/hidden users chips render inside their respective expanded panels
- The icon shows a small dot indicator when items are selected (e.g., tag count badge)

### Visual design

```text
┌─────────────────────────────────────┐
│ Posting as Ghost_Panda              │
├─────────────────────────────────────┤
│ Spill the tea...                    │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [@] [👻] [✓] [⏱]          [Post]  │
├─────────────────────────────────────┤
│ (expanded panel if icon active)     │
│ e.g. tag search + chips             │
│ or burner: [12h] [1 day] [1 week]  │
└─────────────────────────────────────┘
```

Icons use colored active states:

- Tag: primary/purple glow when tags selected
- Hide: red glow when users hidden
- Followers: primary glow when active
- Burner: red/orange glow when duration selected