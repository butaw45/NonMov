import Logo from '../components/Logo'

// Tampil ketika VITE_TMDB_API_KEY belum diisi — panduan singkat, bukan halaman rusak.
export default function Setup() {
  return (
    <div className="setup">
      <div className="setup-card">
        <Logo height={30} />
        <div style={{ height: 24 }} />
        <span className="kicker">Satu langkah lagi</span>
        <h1>Sambungkan dulu ke TMDB</h1>
        <p>
          LAYAR mengambil seluruh data film &amp; series — poster, sinopsis, cast, rating —
          dari TMDB. Kamu butuh API key untuk mulai; gratis dan hanya butuh sekitar dua menit.
        </p>
        <ol className="setup-steps">
          <li>
            Daftar di{' '}
            <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer">
              themoviedb.org
            </a>
            .
          </li>
          <li>
            Buka Settings → API, pilih tipe <em>Developer</em>, isi formulir singkatnya.
          </li>
          <li>
            Salin <strong>API Key (v3 auth)</strong> ke file <code>.env</code> di root proyek:
          </li>
        </ol>
        <div className="codebox">VITE_TMDB_API_KEY=tempel_key_kamu_disini</div>
        <div className="setup-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Sudah Diisi — Muat Ulang
          </button>
          <a
            className="btn btn-ghost"
            href="https://developer.themoviedb.org/docs/getting-started"
            target="_blank"
            rel="noreferrer"
          >
            Dokumentasi TMDB
          </a>
        </div>
        <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--faint)' }}>
          Catatan: key dipakai langsung dari browser untuk keperluan demo. Saat produksi,
          proxied-kan permintaan TMDB lewat backend sendiri supaya key tidak terekspos.
        </p>
      </div>
    </div>
  )
}
