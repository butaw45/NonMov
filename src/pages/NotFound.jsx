import { Link } from 'react-router-dom'
import { useTitle } from '../lib/hooks'
import { IconHome } from '../components/Icons'

export default function NotFound() {
  useTitle('Halaman tidak ditemukan')
  return (
    <div className="notfound">
      <div>
        <div className="big">404</div>
        <h1>Rol film ini tidak ketemu.</h1>
        <p>
          Halaman yang kamu cari mungkin sudah dipotong dari gulungan, atau memang tidak pernah
          ada di katalog.
        </p>
        <Link className="btn btn-primary" to="/">
          <IconHome size={16} />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}
