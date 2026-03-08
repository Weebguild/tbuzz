

## Plan: Read Receipts Polish, Online Presence, Long Message Fix

### 1. Fix Long Messages Overflowing Chat Bubbles
**File:** `src/pages/ChatRoom.tsx`

Add `break-words` and `overflow-hidden` to the message bubble container to prevent long URLs or unbroken text from escaping the rounded bubble.

- Line 610: Add `overflow-hidden` to the bubble div
- Line 658: Add `break-all` or `break-words` class to the text paragraph wrapper, plus `overflow-hidden` and `word-break: break-word`

### 2. Improve Read Receipt Visibility
**File:** `src/pages/ChatRoom.tsx`

The read receipts (lines 692-703) already show `Check` / `CheckCheck` but at `opacity-30` making them hard to see. Changes:
- Make the `CheckCheck` icon (read) show in a brighter primary/cyan color without the low opacity
- Keep the single `Check` (delivered) in a muted white
- Change the container from `opacity-30` to per-element opacity so timestamps stay subtle but checkmarks are visible

### 3. Real Online Presence Using Supabase Realtime Presence
**File:** `src/pages/ChatRoom.tsx`

Replace the hardcoded green "Online" dot with actual presence tracking:
- Subscribe to a Supabase Realtime presence channel (e.g., `presence:online`) scoped to the conversation
- Track the recipient's presence state
- Show green dot + "Online" only when recipient is actively present
- Show "Last seen X ago" or hide the indicator when offline
- Clean up the presence channel on unmount

The presence channel will use `supabase.channel('presence:online').on('presence', ...)` with `track()` to announce the current user and `presenceState()` to check if the recipient is online.

### Changes Summary

**`src/pages/ChatRoom.tsx`:**
- Add presence state + channel subscription in a `useEffect` for online tracking
- Replace hardcoded green dot (line 442) with conditional rendering based on `isRecipientOnline`
- Replace "Online" text (lines 449-450) with conditional "Online" / "Offline" 
- Add `overflow-hidden` and `break-words` to message bubble (line 610) and text wrapper (line 658)
- Adjust read receipt styling (lines 692-703): remove blanket `opacity-30`, make `CheckCheck` brighter primary, `Check` muted

