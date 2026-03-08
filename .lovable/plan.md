

## Fix: Activity Deep-link Routing

### Root Cause
The deep-link `useEffect` in both Feed.tsx and Gossip.tsx depends on `[loading, posts.length]`. When the user is already on `/feed` and clicks a notification that navigates to `/feed?postId=...`, the component doesn't remount — `loading` and `posts.length` remain unchanged, so the effect never re-fires.

Additionally, the search params are cleared immediately regardless of whether the target element was found.

### Fix

**Feed.tsx** (lines 94-117):
- Add `searchParams.get("postId")` to the dependency array so the effect fires whenever a new postId arrives
- Only clear search params after successfully finding and scrolling to the element
- If the showComments param is present, also trigger `loadComments` for that post

**Gossip.tsx** (lines 85-101):
- Same fix: add `searchParams.get("gossipId")` to the dependency array
- Only clear params on successful scroll

### Files Changed
| File | Change |
|---|---|
| `src/pages/Feed.tsx` | Fix useEffect deps to include postId param; only clear params on success |
| `src/pages/Gossip.tsx` | Fix useEffect deps to include gossipId param; only clear params on success |

