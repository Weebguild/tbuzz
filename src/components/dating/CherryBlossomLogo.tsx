/**
 * CherryBlossomLogo — the dating-world identity mark.
 * A stylised "T" built from cherry blossom petals + a delicate stem,
 * in a warm rose/sakura palette. Replaces the main "T" Bebas Neue
 * wordmark while inside the dating section.
 */
export function CherryBlossomLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Tbuzz Dating"
    >
      <defs>
        {/* Warm sakura gradient for petals */}
        <radialGradient id="petal-g" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFCCD5" />
          <stop offset="100%" stopColor="#FF8FAB" />
        </radialGradient>

        {/* Deeper rose for petal centers / depth */}
        <radialGradient id="petal-deep" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFB3C6" />
          <stop offset="100%" stopColor="#E05478" />
        </radialGradient>

        {/* Stem gradient */}
        <linearGradient id="stem-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4607A" />
          <stop offset="100%" stopColor="#9B3050" />
        </linearGradient>
      </defs>

      {/* ── CROSSBAR — row of 5 cherry blossom petals ── */}
      {/* Petal 1 — far left */}
      <ellipse cx="6"  cy="14" rx="5.2" ry="7.5" fill="url(#petal-g)"    transform="rotate(-28 6 14)" />
      <ellipse cx="6"  cy="14" rx="2"   ry="3.2" fill="url(#petal-deep)" transform="rotate(-28 6 14)" opacity="0.45"/>

      {/* Petal 2 */}
      <ellipse cx="16" cy="10" rx="5.2" ry="7.5" fill="url(#petal-g)"    transform="rotate(-10 16 10)" />
      <ellipse cx="16" cy="10" rx="2"   ry="3.2" fill="url(#petal-deep)" transform="rotate(-10 16 10)" opacity="0.45"/>

      {/* Petal 3 — center / tallest */}
      <ellipse cx="24" cy="8"  rx="5.2" ry="7.8" fill="url(#petal-g)" />
      <ellipse cx="24" cy="8"  rx="2"   ry="3.4" fill="url(#petal-deep)" opacity="0.5"/>

      {/* Petal 4 */}
      <ellipse cx="32" cy="10" rx="5.2" ry="7.5" fill="url(#petal-g)"    transform="rotate(10 32 10)" />
      <ellipse cx="32" cy="10" rx="2"   ry="3.2" fill="url(#petal-deep)" transform="rotate(10 32 10)" opacity="0.45"/>

      {/* Petal 5 — far right */}
      <ellipse cx="42" cy="14" rx="5.2" ry="7.5" fill="url(#petal-g)"    transform="rotate(28 42 14)" />
      <ellipse cx="42" cy="14" rx="2"   ry="3.2" fill="url(#petal-deep)" transform="rotate(28 42 14)" opacity="0.45"/>

      {/* ── STEM — vertical bar of the T ── */}
      {/* Main stem */}
      <rect x="21" y="16" width="6" height="26" rx="3" fill="url(#stem-g)" />

      {/* Tiny side branches / buds halfway down */}
      <ellipse cx="18" cy="26" rx="3.5" ry="5"   fill="url(#petal-g)" transform="rotate(-22 18 26)" opacity="0.85"/>
      <ellipse cx="30" cy="28" rx="3.5" ry="5"   fill="url(#petal-g)" transform="rotate(22 30 28)"  opacity="0.85"/>

      {/* Stamen dots on center petal */}
      <circle cx="22" cy="7"  r="1" fill="#C94070" opacity="0.7"/>
      <circle cx="24" cy="5"  r="1" fill="#C94070" opacity="0.7"/>
      <circle cx="26" cy="7"  r="1" fill="#C94070" opacity="0.7"/>

      {/* Tiny falling petal — decorative, bottom right */}
      <ellipse cx="40" cy="40" rx="3" ry="4.5" fill="#FFB3C6" transform="rotate(38 40 40)" opacity="0.6"/>
    </svg>
  );
}
