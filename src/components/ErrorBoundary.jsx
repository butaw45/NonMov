import { Component } from 'react'
import { IconAlert } from './Icons'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="state">
          <IconAlert size={40} />
          <h3>Proyektor macet sebentar.</h3>
          <p>Ada yang tidak beres saat menampilkan halaman ini. Muat ulang untuk melanjutkan.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Muat Ulang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
