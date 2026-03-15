/**
 * SparkLogo — The Ethereal Void identity mark.
 * A sharp, glowing geometric "T" that doubles as a minimalist spark.
 * Built for the Hyper-Glassmorphism aesthetic with cyan/magenta neon lighting.
 */
export function SparkLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Spark Mode"
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00E5FF" />   {/* Electric Cyan */}
          <stop offset="100%" stopColor="#FF00FF" /> {/* Vivid Magenta */}
        </linearGradient>

        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer subtle glow / glass reflection behind */}
      <circle cx="24" cy="24" r="20" fill="url(#spark-grad)" opacity="0.1" filter="url(#neon-glow)" />

      {/* The Core Geometric T / Spark */}
      <g filter="url(#neon-glow)">
        {/* Top bar composed of three sharp diamond/polygon shards */}
        <polygon points="10,14 16,8 22,14 16,20" fill="#00E5FF" opacity="0.9"/>
        <polygon points="24,12 30,6 36,12 30,18" fill="url(#spark-grad)" opacity="0.95"/>
        <polygon points="38,16 42,12 46,16 42,20" fill="#FF00FF" opacity="0.8"/>

        {/* The central descending pillar / spark tail */}
        <polygon points="30,18 24,12 24,36 30,42" fill="url(#spark-grad)" opacity="0.95"/>
        
        {/* Ambient floating spark particles */}
        <circle cx="16" cy="32" r="2" fill="#00E5FF" opacity="0.8" />
        <circle cx="36" cy="30" r="1.5" fill="#FF00FF" opacity="0.7" />
        <circle cx="20" cy="40" r="1" fill="#FFFFFF" opacity="0.9" />
      </g>
    </svg>
  );
}
