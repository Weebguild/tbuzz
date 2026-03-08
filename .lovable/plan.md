

# Real-Time Direct Messaging (DM) Feature

## Overview
Build a full-stack 1-to-1 DM system restricted to mutual followers, with an inbox, chat room, real-time updates, and navigation integration.

---

## Phase 1: Database Schema & Security

### Migration: Create tables, functions, RLS, and realtime

**New tables:**
- `conversations` (id uuid PK, created_at, updated_at)
- `conversation_participants` (id uuid PK, conversation_id FK, user_id uuid, created_at) with unique constraint on (conversation_id, user_id)
- `messages` (id uuid PK, conversation_id FK, sender_id uuid, content text, created_at, is_read boolean default false)

**Security definer functions:**
- `check_mutual_follow(user_a uuid, user_b uuid)` -- returns true if both follow each other
- `is_conversation_participant(conv_id uuid, uid uuid)` -- returns true if user is in conversation

**RLS policies (all restrictive):**
- `conversations`: SELECT where user is a participant (via `is_conversation_participant`)
- `conversation_participants`: SELECT/INSERT where user is a participant or is inserting themselves
- `messages`: SELECT where user is participant of conversation; INSERT where sender_id = auth.uid() AND user is participant
- `messages`: UPDATE (for is_read) where user is participant and sender_id != auth.uid()

**Realtime:** Enable realtime for `messages` table.

**Trigger:** `updated_at` on conversations auto-updates when a new message is inserted.

---

## Phase 2: Frontend -- New Files

### `src/hooks/use-messages.ts`
Custom hook that:
- Fetches message history for a conversation ordered by created_at ASC
- Subscribes to Supabase Realtime INSERT events on `messages` filtered by conversation_id
- Returns messages array, sendMessage function, loading state

### `src/pages/Messages.tsx` (Inbox)
- Route: `/messages`
- Lists all conversations for the current user
- Shows other participant's avatar, name, last message snippet, timestamp
- Clicking a conversation navigates to `/messages/:conversationId`
- Sorted by `updated_at` descending

### `src/pages/ChatRoom.tsx`
- Route: `/messages/:conversationId`
- Header: back button, recipient avatar + name
- ScrollArea with message bubbles (right/primary for own, left/gray for theirs)
- Auto-scroll to bottom on new messages
- Input + Send button (paper plane icon) at bottom
- Marks messages as read when viewing

---

## Phase 3: Profile Page Update

### `src/pages/Profile.tsx`
- Add state: `isMutualFollow` (boolean)
- In `fetchProfileData`, after checking `isFollowing`, also check if the target user follows back (query follows table for reverse direction)
- Next to the Follow/Unfollow button, conditionally render a "Message" button:
  - If mutual follow: enabled, clicking navigates to chat (find-or-create conversation)
  - If not mutual: show disabled button with tooltip "You must follow each other to send messages"

---

## Phase 4: Routing & Navigation

### `src/App.tsx`
- Import Messages and ChatRoom pages
- Add routes inside the ProtectedRoute + AppLayout group:
  - `/messages` -> Messages
  - `/messages/:conversationId` -> ChatRoom

### `src/components/layout/BottomNav.tsx`
- Replace the Leaderboard (Trophy) tab with Messages (Mail icon)
- Add unread badge: query `messages` where `is_read = false` and sender is not current user
- Real-time subscription for unread count updates

### `src/pages/Feed.tsx`
- Add a Leaderboard (Trophy) icon button to the top-right header area alongside Activity and Create buttons

---

## Technical Details

```text
conversations          conversation_participants         messages
+------------+        +------------------------+      +------------------+
| id (PK)    |<-------| conversation_id (FK)   |      | id (PK)          |
| created_at |        | user_id                |      | conversation_id  |
| updated_at |        | id (PK)                |      | sender_id        |
+------------+        +------------------------+      | content          |
                                                       | is_read          |
                                                       | created_at       |
                                                       +------------------+
```

### Find-or-create conversation logic (client-side):
1. Query `conversation_participants` to find a conversation where both users participate
2. If found, navigate to it
3. If not, check mutual follow via client query, then insert new conversation + 2 participants, then navigate

### Files to create:
- `src/hooks/use-messages.ts`
- `src/pages/Messages.tsx`
- `src/pages/ChatRoom.tsx`

### Files to modify:
- `src/pages/Profile.tsx` (add Message button)
- `src/App.tsx` (add routes)
- `src/components/layout/BottomNav.tsx` (replace Leaderboard with Messages + badge)
- `src/pages/Feed.tsx` (add Leaderboard button to header)

