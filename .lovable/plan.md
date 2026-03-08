

## Plan: Remove Shared Panel, Blend Chat Input, Redesign Profile Details

### 1. Remove `DesktopSharedPanel` from Messages (`src/pages/Messages.tsx`)

- Delete the entire `DesktopSharedPanel` component (lines 34-104)
- Remove the rendering of it (lines 457-459): `{!isMobile && conversationId && <DesktopSharedPanel ... />}`
- Remove unused imports: `ImageIcon`, `FileText`, `LinkIcon` (if not used elsewhere)

### 2. Blend Chat + Input into a single unit (`src/pages/ChatRoom.tsx`)

The header, message area, and footer currently feel like three separate sections due to visible borders (`border-b border-white/5` on header, `border-t border-white/5` on footer) and different background opacities.

- **Remove `border-t border-white/5`** from the footer (line 667) — instead use a subtle gradient fade from the scroll area into the input
- **Remove `border-b border-white/5`** from the header (line 370) — use a subtle `shadow-[0_1px_20px_rgba(0,0,0,0.3)]` for depth without a hard line
- **Add a gradient overlay** at the bottom of the scroll area (above the footer) — a `pointer-events-none` div with `bg-gradient-to-t from-background/80 to-transparent h-12` so messages fade into the input area seamlessly
- **Match footer background** to transparent (`bg-transparent`) instead of `bg-white/[0.02]`, and rely on the gradient fade for visual separation
- **Reduce footer padding** from `pb-10 pt-4` to `pb-6 pt-3` for a tighter feel

### 3. Redesign Chat Info/Details Panel (`src/pages/ChatRoom.tsx`)

The info panel (lines 790-863) needs glass-panel treatment and Instagram-style terminology:

- **Background**: Change `bg-black/90 backdrop-blur-3xl` to `glass-panel` style with `bg-black/80 backdrop-blur-2xl`
- **Profile section**: Add a `glass-panel rounded-3xl p-8` card around the avatar + name + "Mutual Connection" badge
- **Action buttons**: Style with `glass-panel rounded-3xl` instead of `bg-white/5 rounded-3xl`. Rename actions:
  - "Share Profile" → "Share Profile" (keep)
  - "Copy Username" → "Copy Profile Link"  
  - "Clear Chat History" → "Delete Conversation"
- **Shared Media section**: Wrap in a `glass-panel rounded-3xl p-6` container with the `text-primary` section label style
- **Add "Mute Notifications"** and **"Block User"** actions with appropriate icons (already imported: `BellOff`, `Ban`)

### Files Changed
- `src/pages/Messages.tsx` — remove `DesktopSharedPanel` component and its rendering
- `src/pages/ChatRoom.tsx` — blend header/chat/input borders, redesign info panel

