## Fix Link Preview & Improve Desktop Chat Dashboard Visibility

### Problem Analysis

1. **Link preview** — The `LinkPreview` component in `ChatRoom.tsx` wraps URLs in `new URL(url)` without a try-catch. Malformed URLs (missing protocol, partial matches from the regex) will crash the component. Also, the styling is too subtle (`bg-white/[0.03]`) to be visible.
2. **Desktop dashboard sections not visible** — The `DesktopChatLayout` component (which has the 4-column layout with sidebar, conversation list, chat, and shared files panel) exists but is **never imported or used** anywhere. The app uses `Messages.tsx` for desktop, which only renders 2 columns (conversation list + chat area) with no right panel. The grid partitions between columns use `border-border/30` which is nearly invisible.
3. The profile info page will also be redesigned in the same design language and the terminolgy like "copy client id" , etc will be changes to be more like instagram

### Plan

#### 1. Fix LinkPreview crash & improve visibility (`src/pages/ChatRoom.tsx`)

- Wrap `new URL(url)` in a try-catch, fallback to showing the raw URL string as domain
- Increase link preview contrast: change `bg-white/[0.03]` to `glass-panel` class for consistent frosted look
- Add a left accent border (`border-l-2 border-primary/30`) so link previews stand out in the chat

#### 2. Improve desktop column dividers (`src/pages/Messages.tsx`)

- Change column border from `border-border/30` to `border-white/[0.08]` so section dividers are subtly visible against the aurora background
- Add a faint inner glow using `shadow-[inset_1px_0_0_rgba(255,255,255,0.03)]` on the chat column for depth

#### 3. Add shared files right panel on desktop (`src/pages/Messages.tsx`)

- When a conversation is selected on desktop, render a right sidebar (w-[280px]) showing shared media from that conversation — reusing the same logic from `DesktopChatLayout` (fetching media from messages table)
- Panel sections: recipient profile summary, shared photos grid, shared files list
- Style with `glass-panel` and `border-l border-white/[0.08]` to match column dividers
- When no conversation is selected, hide the right panel

#### 4. Improve section label visibility (`src/pages/Messages.tsx`)

- Add a faint horizontal line after section labels (`Pinned`, `Recent Messages`) using `border-b border-white/[0.05]` to visually separate sections

All changes confined to `src/pages/ChatRoom.tsx` and `src/pages/Messages.tsx`. No logic changes beyond adding the media fetch for the right panel.