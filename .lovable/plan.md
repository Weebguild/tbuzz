

## Performance Optimization Plan

### Issues Identified

**1. CRITICAL: Realtime listeners trigger full data re-fetches on every change (Feed.tsx lines 243-252, Gossip.tsx lines 243-253)**

Both Feed and Gossip subscribe to `postgres_changes` on `posts`, `reactions`, and `comments` tables with `event: "*"`. Every single change to ANY row in these tables (even from other universities) triggers a full `fetchPosts()` or `fetchGossip()` which does 4-5 parallel Supabase queries. This is the primary cause of slowness — the app is constantly re-fetching everything.

**Fix:** Remove the overly broad realtime re-fetch. The optimistic UI updates for likes/saves/comments already handle the immediate feedback. Only listen for `INSERT` on `posts` (new posts from others) and apply the change locally instead of re-fetching everything. For reactions/comments, rely on optimistic updates already in place.

**2. CRITICAL: `fetchPosts` is called redundantly on multiple dependency changes (Feed.tsx line 237-240)**

`fetchPosts()` depends on `[profile, followingIds]`. When the component mounts, `fetchFollowing()` runs and updates `followingIds`, which triggers `fetchPosts` again even though it was already called from the `profile` dep. This causes a double-fetch on every mount.

**Fix:** Remove `followingIds` from the `fetchPosts` useEffect dependency since following data is not used in post fetching or enrichment.

**3. CRITICAL: Gossip `enrichGossipData` fetches own posts redundantly (Gossip.tsx lines 113-116)**

Every call to `enrichGossipData` fetches ALL of the current user's gossip posts (no filter on IDs), just to determine `is_own`. This is a separate query on every data load.

**Fix:** Compare `user_id` from `gossip_posts` extra data instead, or fetch own post IDs once on mount and reuse.

**4. HIGH: `submitComment` calls both `loadComments` AND `fetchPosts` (Feed.tsx line 393-394)**

Submitting a comment triggers a full feed re-fetch (`fetchPosts`) which re-enriches every post. Since the realtime listener also catches this change, it triggers ANOTHER `fetchPosts`. That's 3 round-trips for one comment.

**Fix:** Only call `loadComments(postId)` and increment the local comment count optimistically. Remove the `fetchPosts()` call from `submitComment`.

**5. HIGH: Staggered animation delays scale with post count (Feed.tsx line 548)**

`delay: i * 0.05` means the 20th post gets a 1-second delay before appearing. Combined with the 300ms deep-link timeout, this creates perceived slowness.

**Fix:** Cap the stagger delay with `Math.min(i * 0.05, 0.3)` so posts beyond the 6th render immediately.

**6. HIGH: Gossip posts have expensive per-card `whileHover` with scale+translateY (Gossip.tsx line 579)**

Every gossip card recalculates layout on hover due to `scale(1.01)` and `translateY(-2)`. With backdrop-blur cards, this forces GPU re-compositing.

**Fix:** Remove `whileHover` from gossip cards. The CSS `.glass-card-modern:hover` already handles the hover transform.

**7. MEDIUM: `fire-flicker` animation runs at 0.15s interval infinitely (index.css line 151)**

`animation: fire-flicker 0.15s ease-in-out infinite alternate` — this is a ~6.7fps CSS animation causing constant repaints for hot gossip cards. Multiple hot cards multiply the paint cost.

**Fix:** Increase to `1.5s` which still creates a flickering fire effect without thrashing the compositor.

**8. MEDIUM: Aurora background divs use heavy blur filters (AppLayout.tsx lines 19-26)**

Three large `blur(120px)` / `blur(150px)` divs with `mix-blend-screen` running CSS animations. These are always composited.

**Fix:** Add `will-change: transform` to these elements and reduce blur to `80px` which is visually similar but cheaper.

**9. MEDIUM: Splash screen runs for 5.5 seconds with WebGL**

The Three.js LiquidBackground loads the entire Three.js library (500KB+) for a splash screen that plays for 5.5 seconds.

**Fix:** Reduce splash to 3 seconds total (enter 0.5s, sustain to 2s, exit at 2.5s, complete at 3s). This doesn't change functionality — just gets users to content faster.

**10. LOW: `glass-panel` uses `backdrop-blur-[24px]` on every post card**

`backdrop-filter: blur(24px)` is expensive on mobile. Each post card has this.

**Fix:** Reduce to `backdrop-blur-md` (12px) which is visually similar but ~2x cheaper.

**11. LOW: Gossip initial animation uses `filter: "blur(10px)"` per card (Gossip.tsx line 577)**

Each gossip card animates from `blur(10px)` to `blur(0px)`. Filter animations are GPU-expensive.

**Fix:** Remove the blur from initial/animate and use only opacity + scale for entrance.

### Files Changed

| File | Changes |
|---|---|
| `src/pages/Feed.tsx` | Remove broad realtime re-fetch; remove `followingIds` from fetch dep; remove `fetchPosts()` from `submitComment`; cap stagger delay; add `initial={false}` to prevent re-animation |
| `src/pages/Gossip.tsx` | Remove broad realtime re-fetch; remove redundant own-posts query; remove `whileHover` from cards; simplify entrance animation |
| `src/components/layout/AppLayout.tsx` | Add `will-change: transform` to aurora divs; reduce blur values |
| `src/components/SplashScreen.tsx` | Reduce splash duration from 5.5s to 3s |
| `src/index.css` | Increase `fire-flicker` duration; reduce `glass-panel` blur |

### What is NOT changed
- All existing functionality (likes, comments, saves, follows, deep-links, notifications, realtime badge updates)
- Visual design and layout
- Database schema and RLS policies
- Component structure and routing

