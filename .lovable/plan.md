

## Issues Found

### 1. Double Heart Icon (Feed)
In `Feed.tsx` line 582, `<HeartBurst show={post.has_liked} />` is always rendered when `has_liked` is true — meaning every liked post permanently shows the burst heart overlay (a big filled heart in the center) ON TOP of the regular `<Heart>` icon on line 583. The HeartBurst should only fire momentarily when the user clicks like, not persist based on `has_liked` state.

### 2. Multiple Upvotes Allowed (Gossip)
In `Gossip.tsx` line 299-306, `toggleUpvote` does a simple insert without checking for duplicates. The `reactions` table has no unique constraint on `(user_id, gossip_post_id)`, so a user can spam-click and insert multiple upvote rows. The same issue exists in `Feed.tsx` line 259-266 for `toggleLike` with `(user_id, post_id)`.

### 3. No Optimistic UI Guard
Both `toggleUpvote` and `toggleLike` don't disable the button or use optimistic state — the user can click rapidly before the async operation completes, inserting duplicate reactions.

---

## Plan

### A. Fix HeartBurst in Feed (double heart)
- Add a `burstingPostId` state (`string | null`) in Feed.tsx
- When user clicks like (and it's not already liked), set `burstingPostId = post.id`
- Pass `show={burstingPostId === post.id}` to `<HeartBurst>` instead of `show={post.has_liked}`
- On `onComplete` callback, reset `burstingPostId` to `null`
- This makes the burst animation fire once on click, then disappear

### B. Add unique constraint on reactions table
- Create a migration adding a unique index on `(user_id, post_id)` where `post_id IS NOT NULL` and another on `(user_id, gossip_post_id)` where `gossip_post_id IS NOT NULL`
- This prevents duplicate reactions at the database level

### C. Add optimistic UI + guard for like/upvote
- **Feed `toggleLike`**: Add optimistic state update (toggle `has_liked` and adjust `reaction_count` immediately), add an `isLiking` guard ref to prevent double-clicks
- **Gossip `toggleUpvote`**: Same pattern — optimistic toggle of `has_upvoted` and `upvote_count`, plus guard ref
- Use `.eq("reaction_type", "like")` / `.eq("reaction_type", "upvote")` in the delete queries for safety

### Files Changed
| File | Change |
|------|--------|
| `src/pages/Feed.tsx` | Fix HeartBurst to use transient state; add optimistic like toggle with guard |
| `src/pages/Gossip.tsx` | Add optimistic upvote toggle with guard |
| Migration | Add unique partial indexes on `reactions` table |

