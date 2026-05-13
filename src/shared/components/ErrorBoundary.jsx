import { Component } from 'react'

// Captura errores de render para evitar pantalla blanca y enviar a observability si existe.
// Cuando integres Sentry, sustituir el console.error por Sentry.captureException(error).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.assign('/')
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Algo fallo</p>
          <h1>No hemos podido cargar la pantalla</h1>
          <p className="muted">
            Hubo un error inesperado. Puedes intentar volver al inicio. Si persiste, contacta con soporte.
          </p>
          <button type="button" className="primary-action" onClick={this.handleReload}>
            Volver al inicio
          </button>
        </section>
      </main>
    )
  }
}
