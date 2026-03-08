

## Smoother Blend & Info Panel Consistency

### 1. Soften the gradient blend (line 650)

The current `from-background/80` is too opaque — creates a visible band. Change to a taller, much softer gradient:

- `h-16` → `h-24`
- `from-background/80` → `from-background/40`
- This makes the fade barely perceptible rather than a visible stripe

### 2. Soften header shadow (line 370)

The `shadow-[0_1px_20px_rgba(0,0,0,0.3)]` is harsh. Replace with `shadow-[0_1px_12px_rgba(0,0,0,0.15)]` — just enough depth to separate without a visible edge.

### 3. Info panel — full glass-card treatment (lines 792-890)

The info panel currently uses `bg-background/95 backdrop-blur-2xl` which is nearly opaque and doesn't match the translucent glass-card system used elsewhere.

**Changes:**
- Root panel: `bg-background/95` → `bg-black/60 backdrop-blur-3xl` — let the aurora bleed through
- Profile card (line 808): Add the outer `glass-card-modern` wrapper with `glass-card-inner` for the avatar section, matching Feed post cards
- Action sections (lines 832, 868): Wrap in `glass-card-modern` / `glass-card-inner` structure instead of bare `glass-panel`
- Shared media section (line 820): Same `glass-card-modern` / `glass-card-inner` treatment
- Close button (line 800): Use `bg-white/[0.04] border border-white/[0.05]` instead of `glass-panel` for a lighter touch
- "Details" header text: Use `text-primary/60` instead of `text-muted-foreground` for brand consistency

### Files changed
- `src/pages/ChatRoom.tsx` only

