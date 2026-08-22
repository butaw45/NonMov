// Logo LAYAR: ikon layar bioskop + wordmark.

export default function Logo({ withWord = true, height = 30 }) {
  return (
    <span className="logo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg viewBox="0 0 48 48" style={{ height, width: 'auto' }} aria-hidden="true">
        <rect
          x="4" y="8" width="40" height="28" rx="4"
          fill="none" stroke="var(--accent)" strokeWidth="2.5"
        />
        <line
          x1="4" y1="26" x2="44" y2="26"
          stroke="var(--accent)" strokeWidth="1" opacity="0.4"
        />
        <circle cx="16" cy="17" r="1.8" fill="var(--accent-2)" />
        <circle cx="32" cy="17" r="1.8" fill="var(--accent-2)" />
      </svg>
      {withWord && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: height * 0.7,
            letterSpacing: '0.06em',
            lineHeight: 1,
            color: 'var(--ink)',
          }}
        >
          LAYAR
        </span>
      )}
    </span>
  )
}
