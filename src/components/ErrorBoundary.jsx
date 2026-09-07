import { Component } from 'react'

// Keeps a render-time throw from white-screening the app, and shows the error
// so it can be reported.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <h2>Something broke</h2>
        <pre>{String(this.state.error?.stack || this.state.error)}</pre>
        <div className="crash-actions">
          <button className="primary" onClick={() => this.setState({ error: null })}>
            Try to recover
          </button>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
