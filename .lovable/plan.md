

## Performance Optimization Plan — Round 2

### Issues Found

**1. CRITICAL: Messages page N+1 query waterfall (Messages.tsx lines 98-129)**

`fetchConversations` loops through every conversation sequentially, making 2 individual queries per conversation (last message + unread count). With 10 conversations, that's 20 sequential network requests. This is the #1 cause of slow Messages page load.

**Fix:** Batch both queries. Fetch all messages for all conversation IDs in one query (ordered by created_at desc), then group client-side. Fetch all unread counts in one query using `.in("conversation_id", convIds)`.

**2. HIGH: AuthProvider double-fetches profile on mount (useAuth.tsx lines 50-69)**

Both `onAuthStateChange` and `getSession` fire on mount and both call `fetchProfile`. The `setTimeout` on line 55 doesn't prevent the race — it just defers one by a tick.

**Fix:** Add a `fetchingRef` to deduplicate. If a fetch is already in-flight for the same userId, skip.

**3. HIGH: BottomNav unread listener is unfiltered (BottomNav.tsx line 51)**

`event: "*"` on the entire `messages` table. Every message sent by anyone triggers `fetchUnread`. This fires on every INSERT, UPDATE (mark-read), etc.

**Fix:** Change to `event: "INSERT"` only. Mark-as-read doesn't increase unread count so no need to re-fetch on UPDATE.

**4. HIGH: Feed `deletePost` and Gossip `deleteGossip` call full re-fetch (Feed.tsx:345, Gossip.tsx:364)**

Deleting a post triggers `fetchPosts()`/`fetchGossip()` which re-fetches and re-enriches the entire feed. Should just remove the item from local state.

**Fix:** Replace `fetchPosts()` with `setPosts(prev => prev.filter(p => p.id !== postId))`. Same for gossip.

**5. HIGH: Feed `handlePost` calls `fetchPosts()` after insert (Feed.tsx:276)**

The realtime INSERT listener on line 247 already calls `fetchPosts()` when a new post arrives. Calling it manually in `handlePost` causes a double-fetch.

**Fix:** Remove `fetchPosts()` from `handlePost`. The realtime listener handles it.

**6. MEDIUM: Gossip `handlePost` same double-fetch (Gossip.tsx:301)**

Same issue — `fetchGossip()` called manually after insert, while realtime listener on line 239 also fires.

**Fix:** Remove `fetchGossip()` from `handlePost`.

**7. MEDIUM: TrendingTicker blur animation on every rotation (TrendingTicker.tsx:64)**

`filter: "blur(4px)"` on initial and exit. Each 4-second rotation triggers a blur filter animation. On mobile this forces GPU filter compositing every 4s.

**Fix:** Remove `filter` from initial/exit. Keep opacity + y only.

**8. LOW: Messages realtime INSERT listener is unfiltered (Messages.tsx:166)**

Any INSERT to the global `messages` table triggers a full `fetchConversations` (which has the N+1 problem above). Even messages from other users' conversations trigger this.

**Fix:** After fixing the N+1 issue, this becomes less critical, but ideally filter or debounce. At minimum, add a 500ms debounce to prevent rapid-fire re-fetches.

### Files Changed

| File | Changes |
|---|---|
| `src/pages/Messages.tsx` | Batch last-message + unread-count queries; debounce realtime listener |
| `src/hooks/useAuth.tsx` | Add fetchingRef to deduplicate profile fetch |
| `src/components/layout/BottomNav.tsx` | Change realtime listener from `*` to `INSERT` |
| `src/pages/Feed.tsx` | Remove `fetchPosts()` from `deletePost` and `handlePost`; use local state updates |
| `src/pages/Gossip.tsx` | Remove `fetchGossip()` from `deleteGossip` and `handlePost`; use local state updates |
| `src/components/feed/TrendingTicker.tsx` | Remove blur filter from animation |

### What is NOT changed
- All existing functionality (messaging, posting, deleting, likes, saves, follows, notifications, deep-links)
- Visual design and layout
- Database schema and RLS policies
- Component structure and routing

