

## Minor UI Tweaks to Messages Panel

The Messages panel already has a solid structure. The goal is to bring it closer to the design language used in Feed and Gossip pages (glass panels, consistent heading styles, subtle glow effects) without changing the layout.

### Changes to `src/pages/Messages.tsx`

1. **Header styling** — Match the Feed/Gossip heading style: use `tracking-widest` instead of `tracking-tight`, add `drop-shadow-md`, and style the subtitle to match Gossip's `text-muted-foreground/80` pattern.

2. **Search bar** — Add `glass-panel` class to the search container (matching other pages' frosted glass look) instead of the raw `bg-[#111]` solid background. Keep the glow-on-focus behavior.

3. **Conversation cards** — Add a subtle `backdrop-blur` and use `glass-panel` or `bg-white/[0.03] backdrop-blur-sm` for the card background on hover/active states, matching the frosted card aesthetic from Feed posts.

4. **Section headers** ("Pinned", "Recent Messages") — Use `text-primary` for labels instead of `text-white/40` to match the accent color used in Gossip filter pills and section headers.

5. **"New Conversation" button (desktop)** — Add a subtle `shadow-[0_0_15px_rgba(255,255,255,0.1)]` glow matching the Gossip composer button style.

6. **Empty state** — Add a faint `glass-panel` container around the "Select a Chat" empty state on desktop for visual consistency.

7. **Pinned avatar ring** — Use `ring-primary/30` default instead of `ring-[#050505]` to add a subtle accent glow around pinned avatars.

8. **Unread badge styling** — Keep the `text-primary font-black` but add a small dot indicator (like the online dot) next to unread conversations for extra visual cue.

All changes are cosmetic — no layout, logic, or structural modifications.

