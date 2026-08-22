// Kicker: eyebrow "NO. xxxxx · LABEL" — mono, kecil, uppercase.
// Presentasional murni — tidak ada hook, routing, atau side-effect.
export default function Kicker({ no, label }) {
  return (
    <p className="kicker">
      NO. {String(no).padStart(5, '0')} · {label}
    </p>
  )
}