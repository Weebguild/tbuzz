

## Redesign Messages Page for Visual Consistency

The core issue: Messages uses `bg-[#050505]`, `bg-black/20`, `bg-[#111]` solid backgrounds and its own layout wrapper, while Feed and Gossip use the global aurora background with `glass-panel` cards, `rounded-3xl`, and consistent typography. The Messages page essentially creates its own dark world that blocks the shared aurora.

### Key Design Gaps

1. **Background**: Messages sets `bg-[#050505]` on its root div, hiding the global aurora. Feed/Gossip are transparent and let it show through.
2. **Container padding**: Feed/Gossip use `px-4 pt-6 pb-4`. Messages uses `px-6 pt-12` with completely different spacing.
3. **Header**: Feed/Gossip use `text-4xl tracking-widest uppercase drop-shadow-md`. Messages uses `text-5xl` — too large.
4. **Conversation cards**: Use flat `bg-transparent` / plain borders instead of `glass-panel` or `glass-card-modern` styling used in Feed/Gossip post cards.
5. **Loading skeletons**: Messages has custom skeleton markup vs Feed/Gossip using `<PostSkeleton />`.
6. **"New Conversation" button**: Solid white button doesn't match the `bg-foreground text-background rounded-full` action buttons in Feed/Gossip headers.
7. **Empty state**: The desktop "Select a Chat" panel is wrapped in glass but the opacity-30 makes it nearly invisible.
8. **Section labels**: Already use `text-primary` (good), but the overall card/container feel is flat.

### Changes to `src/pages/Messages.tsx`

1. **Remove opaque backgrounds** — Change root `bg-[#050505]` to `bg-transparent` so the global aurora shows through (matching Feed/Gossip). Remove `bg-black/20` from the conversation list column.

2. **Normalize header** — Change `text-5xl` to `text-4xl` to match Feed/Gossip. Adjust padding from `px-6 pt-12` to `px-4 pt-6 pb-4` for consistency.

3. **Restyle conversation cards as glass cards** — Wrap each conversation item in `glass-panel rounded-3xl` styling (matching Feed post cards). Add subtle `hover:border-primary/30 transition-colors` like Feed cards. Remove the current bare `hover:bg-white/[0.03]`.

4. **Move "New Conversation" button into header** — Place a `h-10 w-10 rounded-full bg-foreground text-background` Plus button in the header row (matching Feed/Gossip composer toggle buttons), and remove the bottom "New Conversation" bar on desktop.

5. **Fix empty state** — Remove `opacity-30`, keep the `glass-panel` container, match the muted styling of Feed/Gossip empty states.

6. **Normalize loading skeleton** — Use the same `PostSkeleton`-like glass-panel skeleton cards with matching border radius and animation.

7. **Search bar** — Keep current glass-panel search (already consistent), just match padding to `px-4`.

8. **Desktop chat column** — Change `bg-[#050505]` to `bg-transparent` to let aurora bleed through behind the chat area too.

All changes confined to `src/pages/Messages.tsx`. No logic changes — purely cosmetic alignment with Feed/Gossip design language.

