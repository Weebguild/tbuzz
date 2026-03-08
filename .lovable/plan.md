

## Comprehensive Quality Improvement Plan

After two full passes through the codebase, here are the issues and improvements organized by priority.

---

### 1. Bug Fixes

**A. Chat Info Panel missing department/bio/year data**
The recipient fetch (ChatRoom.tsx line 87-91) only selects `user_id, display_name, avatar_url` from profiles. The info panel (lines 968-992) casts `recipient as any` to access `.department`, `.year`, `.bio` but these are never fetched.
- **Fix:** Expand the profiles select to include `department, year, bio` and update the recipient type.

**B. Conversation list always shows green "online" dot**
Messages.tsx line 359-362: Every conversation item shows a green ping dot unconditionally. There's no presence check per conversation.
- **Fix:** Remove the always-on online indicator from the conversation list, or implement actual presence tracking per conversation.

**C. Block uses localStorage instead of database**
ChatRoom.tsx line 275-278: Block stores to `localStorage` which is device-specific and easily bypassed.
- **Fix:** Use the existing `blocked_users` table (already has RLS) instead of localStorage.

**D. Onboarding doesn't use Midnight Glass styling**
Onboarding.tsx uses `bg-card`, `border-border` which renders as the old card style, inconsistent with the rest of the app.
- **Fix:** Apply `glass-panel`, `bg-black/40` styling to match the aesthetic.

### 2. UX Improvements

**E. Like animation on Feed posts**
Currently liking a post just changes color. Add a satisfying heart pop animation.
- **Fix:** Add `whileTap={{ scale: 1.3 }}` on the heart button and a brief scale bounce using framer-motion spring.

**F. Pull-to-refresh on Feed and Gossip**
No way to manually refresh content other than page reload.
- **Fix:** Add a subtle "pull down to refresh" indicator at the top of Feed and Gossip pages.

**G. Empty state illustrations**
Empty states across Feed, Gossip, Messages just show plain text. 
- **Fix:** Add animated empty state with a subtle ghost/illustration icon and a call-to-action button.

**H. Staggered post entrance animations**
Feed posts all animate in at once. Gossip has it but Feed doesn't use staggered delays.
- **Fix:** Add staggered `delay: i * 0.05` to Feed post animations (already done in Gossip).

**I. Page transition animations**
Navigation between pages has no transition. Content just pops in.
- **Fix:** Wrap `<Outlet />` in `AnimatePresence` with a subtle fade transition in `AppLayout.tsx`.

**J. Smooth tab transitions on Profile**
Profile tabs already use `AnimatePresence` but the switch feels abrupt with `y` animations.
- **Fix:** Add `x`-based directional transitions (slide left/right based on tab direction).

**K. Chat info panel — add "View Profile" button**
Info panel has no way to navigate to the recipient's full profile.
- **Fix:** Add a "View Profile" button that navigates to `/profile/{userId}`.

**L. Leaderboard podium for top 3**
Top 3 entries look identical to the rest. Add a visual podium/crown treatment.
- **Fix:** Render top 3 in a special podium layout with larger avatars, gold/silver/bronze rings, and scale animations.

### 3. Animation Additions

**M. Like heart burst particles on Feed**
When liking a post, spawn small heart particles that float up and fade (similar to Instagram).
- **Fix:** Create a small `HeartBurst` component using framer-motion that spawns 5-6 mini hearts on like.

**N. Typing indicator refinement**
The typing indicator dots bounce uniformly.
- **Fix:** Add slight size variation and opacity wave for a more organic feel.

**O. Message send animation**
Messages appear with a basic scale/y animation.
- **Fix:** Add a subtle slide-up from the input area with elastic spring for sent messages.

**P. Gossip card hover micro-interactions**
Gossip cards already have `whileHover` but could benefit from a subtle tilt effect.
- **Fix:** Add `rotateY` or subtle perspective tilt on hover for glass cards.

### 4. Auth & Onboarding Polish

**Q. Auth page — Midnight Glass consistency**
Auth page uses `bg-card` and `border-border` which doesn't match the glass aesthetic.
- **Fix:** Replace card styling with `glass-panel` and dark theme inputs.

**R. Onboarding multi-step wizard**
Current onboarding is a single long form. Breaking it into steps would improve completion rate.
- **Fix:** Split into 3 animated steps: (1) Username + Alias, (2) Avatar + Bio, (3) Year/Dept/Stream. Add a progress bar and slide transitions.

---

### Implementation Priority (files changed)

| File | Changes |
|------|---------|
| `src/pages/ChatRoom.tsx` | Fix recipient profile fetch (add dept/bio/year), add "View Profile" button in info panel, use `blocked_users` table for blocking |
| `src/pages/Feed.tsx` | Staggered post animations, heart burst on like, pull-to-refresh |
| `src/pages/Gossip.tsx` | Pull-to-refresh |
| `src/pages/Messages.tsx` | Remove fake always-on green dot |
| `src/pages/Profile.tsx` | Directional tab transitions |
| `src/pages/Auth.tsx` | Glass panel styling |
| `src/pages/Onboarding.tsx` | Multi-step wizard with glass styling |
| `src/pages/Leaderboard.tsx` | Top 3 podium layout |
| `src/components/layout/AppLayout.tsx` | Page transition animations |
| `src/components/feed/HeartBurst.tsx` | New — heart particle burst component |

