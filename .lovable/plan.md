

## Performance Optimization Plan — Round 3

### Issues Found

**1. HIGH: Profile page has unfiltered realtime listener on entire `reactions` table (Profile.tsx line 510)**

`event: "*"` on `public.reactions` with no filter. Every like/unlike by any user on any post triggers state updates. This is the same broad listener pattern we already fixed in Feed and Gossip.

**Fix:** Remove this realtime listener entirely. The optimistic `toggleLike` on line 538 already handles immediate UI updates. When revisiting the profile, `fetchProfileData` loads fresh counts.

**2. HIGH: Profile `fetchProfileData` makes 2 sequential queries for posts instead of 1 (Profile.tsx lines 200-212)**

Two separate queries: one for photo posts (`image_url IS NOT NULL`) and one for text posts (`image_url IS NULL`). These could be a single query fetching all posts, then split client-side.

**Fix:** Fetch all posts in one query, then partition into photos and text posts client-side.

**3. MEDIUM: Gossip realtime channel tears down and rebuilds on every `fetchGossip` recreation (Gossip.tsx line 242)**

`fetchGossip` is in the dependency array of the realtime useEffect. Since `fetchGossip` is recreated whenever `timeRange`, `filterMode`, or `enrichGossipData` changes, the channel is destroyed and resubscribed on every filter change. This causes a brief disconnect.

**Fix:** Remove `fetchGossip` from the realtime useEffect deps. Use a ref to always call the latest `fetchGossip` without re-subscribing the channel.

**4. MEDIUM: Feed realtime channel same issue (Feed.tsx line 250)**

`fetchPosts` in the dependency array causes channel teardown/rebuild when `enrichPosts` changes.

**Fix:** Same ref pattern — use a ref to hold the latest `fetchPosts` and keep channel subscription stable.

**5. MEDIUM: BottomNav unread query uses `select("*")` when only count is needed (BottomNav.tsx line 40-44)**

The query fetches all columns with `head: true` which is fine, but the realtime listener on line 51 has no filter — it fires for ALL message inserts globally, not just ones for the current user.

**Fix:** The listener can't easily be filtered by recipient (no `recipient_id` column), but we can debounce it like we did in Messages.tsx to prevent rapid re-fetches.

**6. LOW: `SplashScreen` exit animation uses `filter: "blur(10px)"` (SplashScreen.tsx line 36)**

The exit applies blur to the entire splash screen div (including the WebGL canvas). This is a one-time cost but on low-end devices it can cause a frame drop during the transition.

**Fix:** Remove `filter: "blur(10px)"` from the exit animation. Keep `opacity: 0` and `scale: 1.05` which provide sufficient visual feedback.

### Files Changed

| File | Changes |
|---|---|
| `src/pages/Profile.tsx` | Remove unfiltered reactions realtime listener; merge 2 post queries into 1 |
| `src/pages/Gossip.tsx` | Stabilize realtime channel with ref pattern |
| `src/pages/Feed.tsx` | Stabilize realtime channel with ref pattern |
| `src/components/layout/BottomNav.tsx` | Add 500ms debounce to unread message listener |
| `src/components/SplashScreen.tsx` | Remove blur from exit animation |

### What is NOT changed
- All existing functionality (likes, comments, saves, follows, deep-links, notifications, messaging, profile editing)
- Visual design and layout
- Database schema and RLS policies
- Component structure and routing

