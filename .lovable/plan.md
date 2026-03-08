

## Fix Tooltip Z-Index, Redesign Link Preview with Hover Website Preview

### 1. Fix Sidebar Tooltip Z-Index (`src/components/layout/DesktopSidebar.tsx`)

The `TooltipContent` is behind chat elements. Add `z-[9999]` to the `TooltipContent` className to ensure it renders above everything.

### 2. Purple Link Text in Messages (`src/pages/ChatRoom.tsx`)

Currently the message text renders links as plain white text. Replace the plain `<p>` with a function that splits text by URL matches and wraps detected URLs in `<span className="text-primary font-semibold cursor-pointer">` so links appear purple inline before the preview card.

Update `renderMessageText` helper:
- Split message content by URL regex matches
- Non-URL parts render as plain text
- URL parts render as `<a>` tags with `text-primary underline decoration-primary/30` styling

### 3. Redesign LinkPreview with Hover-to-Preview Animation (`src/pages/ChatRoom.tsx`)

Replace the current static `LinkPreview` card with an interactive preview inspired by the user's reference:

**Static card (always visible)**:
- Show domain name + favicon area + external link icon in a compact `glass-panel` row
- Domain text in `text-primary` with `font-bold`

**Hover preview card (floating, follows mouse)**:
- On hover over the link preview card, show a floating preview with:
  - Website screenshot/thumbnail using `https://image.thum.io/get/width/560/crop/320/${url}` (free screenshot service)
  - Title = domain name, subtitle = full URL
  - `position: fixed`, `pointer-events-none`, `z-[9999]`
  - Smooth `opacity` + `scale` + `translateY` transition on appear
  - Follows mouse position with boundary checks (viewport edges)
- Styled with `bg-[#1a1a1a]/90 backdrop-blur-xl rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]` matching the reference
- Image with `rounded-xl` inside `p-2` padding

**Implementation approach**:
- Add `onMouseEnter`/`onMouseMove`/`onMouseLeave` handlers to the LinkPreview component
- Track `hoverPosition` and `isHovering` state
- Render the floating card via a portal or fixed-position div
- Preload the thumbnail image on mount

### Files Changed
- `src/components/layout/DesktopSidebar.tsx` — z-index fix
- `src/pages/ChatRoom.tsx` — purple link text + redesigned LinkPreview with hover website preview

