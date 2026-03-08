

## Redesign the "T" Logo

The current logo is a plain gradient circle with a Bebas Neue "T" and a purple glow — reads as generic/cheap.

### Design Direction
A premium, minimal monogram that feels like a luxury streetwear brand mark — think Discord's icon or Threads' logo energy. Bold, clean, young.

### Changes

**1. New Logo Component** — Replace the inline logo in `DesktopSidebar.tsx` (lines 99-103) with a redesigned mark:
- **Shape**: Rounded square (rounded-2xl) instead of circle — more modern/app-icon feel
- **Background**: Subtle dark glass with a thin luminous border (`bg-white/[0.04] border border-white/10`) instead of the loud gradient
- **Letter**: Keep "T" in Bebas Neue but make it larger, bolder, with a subtle gradient text effect (transparent background-clip text from white to white/70) for depth
- **Accent**: A small 4px neon-purple dot/pip below or beside the T as a signature brand accent
- **Hover**: Scale up + the border glows primary color (`hover:border-primary/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.25)]`) — subtle, not garish
- **Remove** the heavy `shadow-[0_0_20px_rgba(124,58,237,0.4)]` always-on glow

**2. SplashScreen logo** (`src/components/SplashScreen.tsx`) — check if it uses a similar logo and update to match for brand consistency.

### Result
Clean glass square with a bold white "T" and a tiny neon accent dot. Minimal, premium, consistent with the Midnight Glass design language.

