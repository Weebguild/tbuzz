

## Plan: Fix Info Panel Stats, Message Overflow, Rework Reactions with Dock, Sidebar Hover Animations

### 1. Fix Follower/Following Counts in Info Panel
**File:** `src/pages/ChatRoom.tsx`

The info panel (line 968-980) shows "—" because the recipient fetch (line 84-87) only selects `user_id, display_name, avatar_url` — no follower counts are fetched.

- Add a separate fetch for follower/following counts using `supabase.from("follows").select("*", { count: "exact", head: true })` (same pattern as Profile.tsx)
- Store in state: `recipientStats: { followers: number; following: number }`
- Display actual numbers instead of "—" in the stats bar

### 2. Fix Message Overflow (Still Broken)
**File:** `src/pages/ChatRoom.tsx`

The bubble container at line 648-658 has `overflow-hidden` but the parent `max-w-[80%]` at line 643 may not constrain properly. Fix:

- Add `min-w-0` to the flex column container (line 642) to prevent flex children from overflowing
- Add `max-w-full` and `overflow-hidden` to the bubble wrapper div (line 647, `group/bubble`)
- Ensure the text `<p>` also has `overflow-hidden` with `word-break: break-word`

### 3. Rework Reactions: Remove Auto-Hover, Add Smile Icon + Drawer
**File:** `src/pages/ChatRoom.tsx`

Currently (lines 703-720), emoji reactions appear on hover automatically. Replace with:

- Remove the hover-triggered emoji row entirely
- Keep the Reply button but add a **Smile icon button** next to it — both visible on hover
- Clicking the Smile icon opens a **Drawer** (from vaul, already installed) with a grid of emojis styled in the Midnight Glass aesthetic
- The drawer shows a curated set of emojis (🔥 ❤️ 😂 😮 👍 😢 🙏 💀 🤯 👀 💯 🎉 etc.)
- Each emoji in the drawer uses the **Dock-style magnification hover animation** from the user's reference code — items scale up on mouse proximity using `useMotionValue` + `useTransform` + `useSpring`
- Clicking an emoji sets the reaction and closes the drawer

### 4. Create Dock Component for Emoji Hover
**File:** `src/components/ui/dock.tsx`

Create the Dock/DockItem/DockIcon/DockLabel components from the user's reference code, adapted to the Midnight Glass theme:
- Dark background (`bg-white/[0.04]` instead of `bg-gray-50`)
- Border styling matching glass-panel aesthetic
- Export `Dock`, `DockItem`, `DockIcon`, `DockLabel`

### 5. Desktop Sidebar Dock-Style Hover Animations
**File:** `src/components/layout/DesktopSidebar.tsx`

Add the same magnetic magnification effect to sidebar nav icons:
- Track `mouseY` position with `useMotionValue`
- Each nav item calculates distance from mouse and scales proportionally using `useTransform` + `useSpring`
- Icons magnify from 24px to ~40px as the cursor approaches, with neighboring icons also scaling slightly
- Maintains existing active indicator and tooltip behavior

### Files Changed
- `src/components/ui/dock.tsx` — New Dock component
- `src/pages/ChatRoom.tsx` — Fix stats fetch, overflow, rework reactions with Drawer + Dock emojis
- `src/components/layout/DesktopSidebar.tsx` — Add dock-style hover magnification

