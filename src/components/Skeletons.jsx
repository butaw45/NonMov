// Kerangka loading yang bentuknya meniru layout asli — bukan spinner generik.

export function HeroSkeleton() {
  return (
    <div className="hero-skel skel" style={{ borderRadius: 0 }}>
      <div className="container">
        <div className="skel skel-line" style={{ width: 160 }} />
        <div className="skel skel-title" />
        <div className="skel skel-line" style={{ width: '90%' }} />
        <div className="skel skel-line" style={{ width: '60%' }} />
      </div>
    </div>
  )
}

export function RowSkeleton({ cards = 7 }) {
  return (
    <div className="row">
      <div className="row-head">
        <div className="skel skel-line" style={{ width: 190, height: 20 }} />
      </div>
      <div className="row-track" style={{ overflow: 'hidden' }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="card" style={{ pointerEvents: 'none' }}>
            <div className="skel skel-poster" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GridSkeleton({ cards = 12 }) {
  return (
    <div className="grid">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card" style={{ pointerEvents: 'none' }}>
          <div className="skel skel-poster" />
        </div>
      ))}
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="detail-hero" style={{ minHeight: 420 }}>
      <div className="container detail-top" style={{ width: 'min(1440px, 100% - clamp(32px, 6vw, 96px))' }}>
        <div className="skel" style={{ aspectRatio: '2/3' }} />
        <div style={{ display: 'grid', gap: 14 }}>
          <div className="skel skel-line" style={{ width: 140 }} />
          <div className="skel skel-title" />
          <div className="skel skel-line" style={{ width: '70%' }} />
          <div className="skel skel-line" style={{ width: '85%' }} />
          <div className="skel skel-line" style={{ width: '50%' }} />
        </div>
      </div>
    </div>
  )
}
