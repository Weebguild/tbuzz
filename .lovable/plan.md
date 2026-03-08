

## Halo Rings — Multi-Color Closeness Indicator

### Color Tiers

| Tier | Condition | Ring Style | Meaning |
|------|-----------|------------|---------|
| **Green glow** | Mutual follow | `ring-2 ring-emerald-400/60` + green shadow + subtle pulse | Close friends |
| **Purple** | You follow them (one-way) | `ring-[1.5px] ring-purple-500/40` | You're interested |
| **Amber** | They follow you (one-way) | `ring-[1.5px] ring-amber-400/40` | They're interested |
| **Blue** | Active DM conversation (messaged in last 7 days) | `ring-2 ring-sky-400/50` + blue shadow | In contact |
| **Default** | No relationship | `ring-1 ring-white/10` | Stranger |

Priority order: Mutual > Active DM > You follow > They follow > Stranger

### Implementation

**1. Create `src/hooks/useHalo.tsx`**
- `HaloProvider` wrapping the app inside `AuthProvider`
- On mount: fetch `followingIds`, `followerIds`, and `recentDmUserIds` (users with messages in last 7 days)
- Subscribe to realtime changes on `follows` table for live updates
- Expose `getHaloClass(userId: string)` that returns the appropriate ring classes based on priority

**2. Edit `src/App.tsx`**
- Wrap routes with `<HaloProvider>`

**3. Add CSS in `src/index.css`**
- `@keyframes halo-pulse` — very subtle scale/opacity pulse for mutual follow rings
- `.animate-halo-pulse` utility class

**4. Apply across all avatar instances**
Replace static `ring-1 ring-white/10` with `getHaloClass(userId)` in:
- `Feed.tsx` — post author + comment avatars (skip own avatar in composer)
- `Messages.tsx` — conversation list avatars
- `ChatRoom.tsx` — recipient header avatar + message avatars
- `UserSearch.tsx` — search result avatars
- `ActivityDrawer.tsx` — notification actor avatars
- `UserHoverCard.tsx` — hover card avatar
- `Leaderboard.tsx` — list entry avatars
- `PostImageExpander.tsx` — comment avatars

Profile page's own avatar keeps its existing `ring-4` styling since it's a display element, not a relationship indicator.

### Files Changed
- **Create**: `src/hooks/useHalo.tsx`
- **Edit**: `src/App.tsx`, `src/index.css`
- **Edit** (avatar classes): `Feed.tsx`, `Messages.tsx`, `ChatRoom.tsx`, `UserSearch.tsx`, `ActivityDrawer.tsx`, `UserHoverCard.tsx`, `Leaderboard.tsx`, `PostImageExpander.tsx`

