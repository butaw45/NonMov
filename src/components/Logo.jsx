// Logo Seluloid: bingkai film + tombol putar, digambar sebagai SVG inline.

export default function Logo({ withWord = true, height = 30 }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg viewBox="0 0 64 64" style={{ height, width: 'auto' }} aria-hidden="true">
        <rect
          x="7"
          y="11"
          width="50"
          height="42"
          rx="6"
          fill="none"
          stroke="var(--amber)"
          strokeWidth="3.5"
        />
        <circle cx="15" cy="20" r="2.2" fill="var(--amber)" />
        <circle cx="15" cy="27.5" r="2.2" fill="var(--amber)" />
        <circle cx="15" cy="35" r="2.2" fill="var(--amber)" />
        <circle cx="15" cy="42.5" r="2.2" fill="var(--amber)" />
        <path d="M26.5 23L46 32 26.5 41z" fill="var(--amber)" />
      </svg>
      {withWord && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: height * 0.62,
            letterSpacing: '0.01em',
            lineHeight: 1,
            color: 'var(--ink)',
          }}
        >
          Seluloid
        </span>
      )}
    </span>
  )
}
