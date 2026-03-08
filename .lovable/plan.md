

## Fix Link Visibility on Purple Bubbles + Add Premium Hover Animation

### Problem
Links use `text-primary` (purple) which is invisible on own-message purple (`bg-primary`) bubbles. Need a styling approach that works on both purple (own) and dark (other) bubbles.

### Changes — `src/pages/ChatRoom.tsx`

**1. Context-aware link color in `renderMessageText`**

The function currently doesn't know if the message is own or other. Pass an `isOwn` parameter:
- **Own messages (purple bubble):** Style links as `text-white font-bold underline decoration-white/40` — bold white with subtle underline, clearly distinct from regular text
- **Other messages (dark bubble):** Style links as `text-cyan-400 font-semibold underline decoration-cyan-400/30` — cyan stands out on dark without clashing with primary purple

**2. Add premium hover glow + underline animation on links**

Add these classes to the `<a>` tag:
- `hover:brightness-125` for a subtle glow effect
- `decoration-2 underline-offset-2` for a thicker, offset underline
- `hover:decoration-white/80` (own) or `hover:decoration-cyan-400/70` (other) for underline intensification on hover
- `transition-all duration-300` for smooth transitions

**3. Update `renderMessageText` call site (line ~654)**

Pass `isOwn` to the function: `renderMessageText(data.content || data.text || "", isOwn)`

### Files Changed
- `src/pages/ChatRoom.tsx` — renderMessageText signature + link styling

