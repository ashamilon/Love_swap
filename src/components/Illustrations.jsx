import './illustrations.css'

// Animated hearts floating upwards, used as a decorative background.
// count = how many hearts to render; they stagger their animation.
export function FloatingHearts({ count = 14, seed = 0 }) {
  const hearts = Array.from({ length: count }, (_, i) => {
    // deterministic pseudo-random distribution so hearts don't jitter on re-render
    const r = Math.abs(Math.sin((i + 1) * (seed + 17.3))) % 1
    const r2 = Math.abs(Math.cos((i + 1) * (seed + 7.1))) % 1
    const r3 = Math.abs(Math.sin((i + 1) * (seed + 3.3))) % 1
    const left = Math.round(r * 100)
    const size = 14 + Math.round(r2 * 28)
    const delay = r3 * 12
    const duration = 10 + r * 10
    const opacity = 0.35 + r2 * 0.45
    const hue = r3 > 0.5 ? 'pink' : 'purple'
    return { i, left, size, delay, duration, opacity, hue }
  })
  return (
    <div className="floating-hearts" aria-hidden="true">
      {hearts.map((h) => (
        <svg
          key={h.i}
          viewBox="0 0 24 24"
          className={`fh fh-${h.hue}`}
          style={{
            left: `${h.left}%`,
            width: h.size,
            height: h.size,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            opacity: h.opacity,
          }}
        >
          <path
            d="M12 21s-7.5-4.8-10-9.6C.4 7.9 3 3 7.3 3c2 0 3.6 1 4.7 2.6C13.1 4 14.7 3 16.7 3 21 3 23.6 7.9 22 11.4 19.5 16.2 12 21 12 21z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  )
}

// Two silhouettes about to kiss — decorative, sits above the title.
export function CoupleSilhouette({ size = 96 }) {
  return (
    <svg
      viewBox="0 0 200 120"
      width={size}
      height={size * 0.6}
      aria-hidden="true"
      className="couple-svg"
    >
      <defs>
        <linearGradient id="csGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff79b0" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a066ff" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="csHeart" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffc5dd" />
          <stop offset="100%" stopColor="#ff3d7a" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="104" rx="70" ry="6" fill="url(#csGlow)" />
      {/* Left person */}
      <g className="couple-left">
        <circle cx="72" cy="46" r="18" fill="#ff79b0" />
        <path d="M54 56 Q72 82 90 56 L96 100 L48 100 Z" fill="#ff79b0" />
        <path d="M58 40 Q60 28 72 28 Q86 28 86 42 Q84 32 74 30 Q66 32 62 38 Z" fill="#6a1f3f" opacity="0.7" />
      </g>
      {/* Right person */}
      <g className="couple-right">
        <circle cx="128" cy="46" r="18" fill="#a066ff" />
        <path d="M110 56 Q128 82 146 56 L152 100 L104 100 Z" fill="#a066ff" />
        <path d="M114 42 Q114 28 128 28 Q142 28 142 42 Q142 50 138 50 Q128 44 120 48 Q116 48 114 44 Z" fill="#2a0f4f" opacity="0.7" />
      </g>
      {/* Floating heart between them */}
      <g className="couple-heart">
        <path
          d="M100 22 C96 14 82 14 82 26 C82 36 100 48 100 48 C100 48 118 36 118 26 C118 14 104 14 100 22 Z"
          fill="url(#csHeart)"
        />
      </g>
    </svg>
  )
}

// A pulsing cupid-style arrow with a heart tip — good for matchmaking or dice.
export function CupidArrow({ size = 80 }) {
  return (
    <svg
      viewBox="0 0 120 60"
      width={size}
      height={size * 0.5}
      aria-hidden="true"
      className="cupid-svg"
    >
      <defs>
        <linearGradient id="cupidShaft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd4e8" stopOpacity="0" />
          <stop offset="50%" stopColor="#ff79b0" />
          <stop offset="100%" stopColor="#a066ff" />
        </linearGradient>
      </defs>
      <line
        x1="8" y1="30" x2="92" y2="30"
        stroke="url(#cupidShaft)"
        strokeWidth="4"
        strokeLinecap="round"
        className="cupid-shaft"
      />
      <g className="cupid-feather">
        <path d="M4 30 L18 22 L18 38 Z" fill="#ff79b0" />
        <path d="M12 30 L24 24 L24 36 Z" fill="#ffc5dd" />
      </g>
      <g className="cupid-head">
        <path
          d="M100 22 C96 14 84 14 84 26 C84 36 100 46 100 46 C100 46 116 36 116 26 C116 14 104 14 100 22 Z"
          fill="#ff3d7a"
        />
      </g>
    </svg>
  )
}

// Big burst of hearts and sparkles — used on heart cell match / reveal moments.
export function HeartBurst({ size = 160, matched = true }) {
  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      aria-hidden="true"
      className={`heart-burst ${matched ? 'is-match' : 'is-miss'}`}
    >
      <defs>
        <radialGradient id="hbMain" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff2f7" />
          <stop offset="60%" stopColor="#ff79b0" />
          <stop offset="100%" stopColor="#d12a66" />
        </radialGradient>
      </defs>
      {matched && (
        <g className="hb-rays">
          {Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1="80" y1="80" x2="80" y2="18"
              stroke="#ff79b0"
              strokeWidth="2.5"
              strokeLinecap="round"
              transform={`rotate(${i * 45} 80 80)`}
              opacity="0.75"
            />
          ))}
        </g>
      )}
      <g className="hb-sparkles">
        {[
          { x: 30, y: 40, r: 2.5 },
          { x: 130, y: 42, r: 3 },
          { x: 28, y: 120, r: 2 },
          { x: 132, y: 124, r: 2.5 },
          { x: 80, y: 20, r: 2 },
          { x: 80, y: 148, r: 2.5 },
        ].map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffe6f0" />
        ))}
      </g>
      <g className="hb-main">
        <path
          d="M80 128 C80 128 36 98 36 66 C36 48 50 36 64 36 C72 36 78 40 80 46 C82 40 88 36 96 36 C110 36 124 48 124 66 C124 98 80 128 80 128 Z"
          fill="url(#hbMain)"
        />
      </g>
    </svg>
  )
}

// Confetti / sparkles burst for the winner screen.
export function SparkleConfetti({ count = 18 }) {
  const items = Array.from({ length: count }, (_, i) => {
    const r = Math.abs(Math.sin((i + 1) * 13.37)) % 1
    const r2 = Math.abs(Math.cos((i + 1) * 5.17)) % 1
    const r3 = Math.abs(Math.sin((i + 1) * 2.77)) % 1
    const left = Math.round(r * 100)
    const size = 6 + Math.round(r2 * 10)
    const delay = r3 * 2
    const duration = 3 + r * 3
    const kind = i % 3
    return { i, left, size, delay, duration, kind }
  })
  return (
    <div className="sparkle-confetti" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.i}
          className={`confetti-piece kind-${p.kind}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// Small animated kiss mark — fits next to flirty prompts.
export function KissMark({ size = 42 }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className="kiss-mark"
    >
      <defs>
        <linearGradient id="kmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5a8a" />
          <stop offset="100%" stopColor="#d12a66" />
        </linearGradient>
      </defs>
      <path
        d="M6 22 C10 14 22 14 24 22 C26 14 38 14 42 22 C44 28 34 34 24 32 C14 34 4 28 6 22 Z"
        fill="url(#kmGrad)"
      />
      <path
        d="M12 26 Q24 34 36 26"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  )
}

// A single animated heart icon, used inline.
export function BeatingHeart({ size = 28, color = '#ff3d7a' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className="beating-heart"
    >
      <path
        d="M12 21s-7.5-4.8-10-9.6C.4 7.9 3 3 7.3 3c2 0 3.6 1 4.7 2.6C13.1 4 14.7 3 16.7 3 21 3 23.6 7.9 22 11.4 19.5 16.2 12 21 12 21z"
        fill={color}
      />
    </svg>
  )
}
