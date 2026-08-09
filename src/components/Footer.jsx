import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Logo height={26} />
            <p>
              Ruang rapi untuk menjelajah film &amp; series — sinopsis, cast, rating, dan daftar
              episode lengkap. Konten yang diputar di sini hanya milik atau berlisensi resmi
              pemilik situs; judul lainnya diarahkan ke platform streaming legal.
            </p>
          </div>
          <div>
            <h4>Jelajah</h4>
            <a className="f-link" href="/">Beranda</a><br />
            <a className="f-link" href="/jelajah?tipe=movie">Film</a><br />
            <a className="f-link" href="/jelajah?tipe=tv">Series</a><br />
            <a className="f-link" href="/watchlist">Daftar Saya</a>
          </div>
          <div>
            <h4>Sumber Data</h4>
            <a className="f-link" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
              TMDB — metadata &amp; gambar
            </a>
            <p style={{ marginTop: 10 }}>
              Tautan menonton diarahkan ke penyedia legal lewat data watch-providers TMDB.
            </p>
          </div>
        </div>
        <div className="footer-note">
          <span>© {new Date().getFullYear()} Seluloid. Katalog pribadi, bukan layanan streaming publik.</span>
          <span>
            This product uses the <span className="tmdb-mark">TMDB</span> API but is not endorsed or
            certified by TMDB.
          </span>
        </div>
      </div>
    </footer>
  )
}
