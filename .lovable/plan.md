

## Plan: Deep-link Activity Notifications to Their Source Content

### Problem
Currently, clicking notifications navigates to generic pages (`/profile`, `/leaderboard`) with no context. The user wants each notification to open the exact post/comment/gossip it refers to.

### Approach
Use URL search params (`?postId=xxx&highlightComment=yyy`) to pass context from notifications to Feed and Gossip pages. The target pages will read these params on mount, scroll to the relevant post, and auto-expand comments if needed.

### Changes

**1. ActivityDrawer.tsx** — Add `entity_id` to Notification interface and update routing:

| Notification Type | Current Route | New Route |
|---|---|---|
| `follow` | `/profile/:actorId` | `/profile/:actorId` (unchanged) |
| `post_like` | `/profile` | `/feed?postId={entity_id}` |
| `post_comment` | `/profile` | `/feed?postId={entity_id}&showComments=true` |
| `gossip_tag` | `/leaderboard` | `/gossip?gossipId={entity_id}` |
| `gossip_upvote` | `/leaderboard` | `/gossip?gossipId={entity_id}` |

- Include `entity_id` in the notification fetch (already selected via `*`)
- Add it to the Notification interface
- Update each `action` callback to navigate with query params

**2. Feed.tsx** — Read `postId` and `showComments` from URL search params:

- Import `useSearchParams`
- On mount, if `postId` param exists:
  - Scroll to that post element using `scrollIntoView` with smooth behavior
  - If `showComments=true`, auto-expand comments for that post
  - Add a brief highlight/pulse animation on the target post (ring glow that fades)
- Clear the search params after scrolling to prevent re-triggering on re-renders

**3. Gossip.tsx** — Read `gossipId` from URL search params:

- Import `useSearchParams`
- On mount, if `gossipId` param exists:
  - Scroll to that gossip card using `scrollIntoView`
  - Add the same highlight/pulse ring effect
- Clear params after scroll

**4. Visual highlight effect** — For both Feed and Gossip, the targeted post gets a temporary glowing ring:
- Apply a CSS class like `ring-2 ring-primary/60 animate-pulse` that auto-removes after ~2 seconds using a timeout

### Files Changed

| File | Change |
|---|---|
| `src/components/layout/ActivityDrawer.tsx` | Add `entity_id` to interface, update navigation routes with query params |
| `src/pages/Feed.tsx` | Read `postId`/`showComments` search params, scroll-to + highlight + auto-expand comments |
| `src/pages/Gossip.tsx` | Read `gossipId` search param, scroll-to + highlight |

