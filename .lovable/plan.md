

## Softer Gradient Blend & Info Panel Redesign

### 1. Soften the gradient blend (`src/pages/ChatRoom.tsx`)

- Change gradient from `from-background/40` to `from-background/20` — barely visible, just enough to hint at depth
- Reduce height from `h-24` to `h-16` for less visual footprint
- Remove the header `shadow-[0_1px_12px_rgba(0,0,0,0.15)]` entirely — rely on content separation alone

### 2. Redesign Info Panel — UserHoverCard-inspired (`src/pages/ChatRoom.tsx`)

Replace the current boxy `glass-card-modern` stacked layout with a design inspired by the `UserHoverCard` popup:

**Profile Section** (top, no card wrapper — direct content like hover card):
- Avatar with neon gradient ring glow (`absolute -inset-1 rounded-full bg-gradient-to-br from-primary/50 to-accent/50 blur-sm`)
- Name in `font-extrabold tracking-tight`, larger (text-3xl)
- Department + Year pills using the same `bg-white/[0.06] border border-white/[0.06] rounded-full` style from hover card
- Bio text in `text-zinc-400` below
- Stats bar (followers/following counts) with `Users` and `UserCheck` icons, separated by a `border-b border-white/[0.05]`
- "Mutual Connection" badge as a subtle pill

**Shared Media** (no card wrapper, just section label + grid):
- Section label: `text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]` matching hover card's "Recent Posts" label
- Grid images with `rounded-xl` and hover scale effect

**Actions** (single flat list, no card wrapper):
- Each action as a simple row with icon + text, subtle `hover:bg-white/[0.04]` — no borders between items, just spacing
- Destructive actions (Block, Delete) in `text-destructive/70` with softer coloring

**Panel background**: `bg-[#0A0A0A]/95 backdrop-blur-2xl` matching the hover card exactly, with the same shadow style

### Files changed
- `src/pages/ChatRoom.tsx` only

