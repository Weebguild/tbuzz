

## Fix Link Detection + Production-Grade Enhancements

### 1. Fix Link Preview Detection (`src/pages/ChatRoom.tsx`)

**Bug**: `getUrlFromText` regex only matches `https?://` prefixed URLs. "amazon.in", "amazon.com" etc. are missed.

**Fix**: Update the regex to also match bare domain patterns:
```
/(https?:\/\/[^\s]+|(?:[\w-]+\.)+(?:com|org|net|io|dev|in|co|app|me|info|biz|edu|gov|xyz|ai|us|uk|de|fr|jp|ru|br|ca|au|it|es|nl|se|no|fi|dk|pl|cz|kr|tw|hk|sg|my|id|th|ph|vn|pk|bd|lk|np|ng|za|ke|eg|ar|cl|mx|co\.in|co\.uk|co\.jp|co\.kr)[^\s]*)
```
Also update `LinkPreview` to prepend `https://` when the URL has no protocol.

### 2. Conversation List: Show Typing Indicator (`src/pages/Messages.tsx`)

Currently typing status is only visible inside the chat. Subscribe to typing broadcasts in the conversation list so users see "typing..." in the last message preview — a premium touch.

### 3. Message Timestamps: Smart Grouping (`src/pages/ChatRoom.tsx`)

Add date separator headers between messages from different days (e.g., "Today", "Yesterday", "Mar 5"). Currently messages have no temporal context beyond relative time on the last bubble in a group.

### 4. Haptic Feedback on Send (`src/pages/ChatRoom.tsx`)

Add `navigator.vibrate?.(10)` on message send for mobile devices — subtle tactile confirmation.

### 5. Optimistic Send (`src/pages/ChatRoom.tsx`)

Show the message immediately in the UI with a "sending" state (reduced opacity + spinner) before the server confirms. Currently there's a delay where the input clears but the message doesn't appear until the realtime event fires.

### 6. Skeleton Shimmer for Chat Loading (`src/pages/ChatRoom.tsx`)

Replace the bare spinner with a chat-specific skeleton: 5-6 alternating left/right bubble skeletons with `animate-skeleton-pulse`. Matches the premium feel of the Messages list skeleton.

### 7. Empty Chat State (`src/pages/ChatRoom.tsx`)

When a conversation has zero messages, show a friendly illustration state: the recipient's avatar with "Say hi to {name}" — rather than just an empty scroll area.

### 8. Activity Drawer Glass Treatment (`src/components/layout/ActivityDrawer.tsx`)

The notification drawer uses hardcoded hex colors (`#0D0D0D`, `#1A1A1A`, `#2D2D2D`) instead of the glass-panel system. Update to match the Midnight Glass aesthetic with `bg-[#0A0A0A]/95 backdrop-blur-2xl`, `glass-panel` notification cards, and `border-white/[0.05]` separators.

### 9. Leaderboard Glass Treatment (`src/pages/Leaderboard.tsx`)

Same issue — uses `bg-card border-border` and `bg-[#0D0D0D]`. Update rows to use `glass-panel` cards, the gossip bottom sheet to `bg-[#0A0A0A]/95 backdrop-blur-2xl`, and gossip cards to `glass-panel` with `border-white/[0.05]`.

### 10. Desktop Sidebar Tooltip Labels (`src/components/layout/DesktopSidebar.tsx`)

The sidebar icons have no labels. Add hover tooltips showing the page name ("Feed", "Gossip", "Messages", "Profile") for discoverability.

### Files Changed
- `src/pages/ChatRoom.tsx` — fixes 1, 3, 4, 5, 6, 7
- `src/pages/Messages.tsx` — fix 2
- `src/components/layout/ActivityDrawer.tsx` — fix 8
- `src/pages/Leaderboard.tsx` — fix 9
- `src/components/layout/DesktopSidebar.tsx` — fix 10

