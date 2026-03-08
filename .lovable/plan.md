

## Visual Consistency for ChatRoom (Individual Chats)

The ChatRoom page uses hardcoded `bg-[#050505]` and `bg-[#111]` backgrounds throughout, blocking the global aurora. It needs the same glass-panel treatment applied to Messages, Feed, and Gossip.

### Changes to `src/pages/ChatRoom.tsx`

1. **Root container** — Replace `bg-[#050505]` with `bg-transparent` on the main `motion.div` (line 358). Remove the custom background gradient blobs (lines 363-366) since the global aurora handles this.

2. **Header** — Replace `bg-[#050505]/40` with `glass-panel` styling: `bg-white/[0.02] backdrop-blur-xl border-b border-white/5`. Update avatar fallback from `bg-[#111]` to `bg-white/5`.

3. **Message bubbles (received)** — Replace `bg-[#111]` with `bg-white/[0.04] backdrop-blur-sm` and `border border-white/5` (glass-panel look). Keep own-message purple styling as-is.

4. **Typing indicator** — Replace `bg-[#111]` with `bg-white/[0.04] backdrop-blur-sm border border-white/5`.

5. **Footer/input area** — Replace `bg-[#050505]/80` with `bg-white/[0.02] backdrop-blur-xl`. Replace input `bg-[#111]` with `bg-white/[0.04] border-white/5`. Replace recording bar `bg-[#111]` with same glass treatment.

6. **Loading state** — Replace `bg-[#050505]` with `bg-transparent`.

7. **Info panel** — Replace `bg-[#050505]` with `bg-black/90 backdrop-blur-3xl`. Replace `bg-[#111]` on media grid items and avatar fallbacks with `bg-white/5`.

8. **Dropdown menu** — Replace `bg-[#0A0A0A]` with `glass-panel bg-black/80 backdrop-blur-xl`.

9. **Link preview** — Replace `bg-black/30` with `bg-white/[0.03] backdrop-blur-sm`.

### Changes to `src/components/chat/DesktopChatLayout.tsx`

10. **Root container** — Replace `bg-[#0A0A0A]` with `bg-transparent`. Replace sidebar `bg-black/40` columns with `bg-white/[0.02] backdrop-blur-sm`.

11. **Desktop sidebar conversation cards** — Use `glass-panel rounded-2xl` on active state instead of `bg-white/5 border border-white/5`.

12. **Empty state panel** — Remove opaque backgrounds, use glass-panel styling.

13. **Right panel (shared files)** — Replace `bg-black/40` with `bg-white/[0.02] backdrop-blur-sm`. Replace `bg-white/5` stat cards and file items with `glass-panel` treatment.

All changes are purely cosmetic — no logic modifications.

