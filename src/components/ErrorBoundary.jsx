import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error("BluePrinted view error:", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="page-loading" role="alert">
      <h1>This view could not open.</h1>
      <p>Your saved projects have not been removed. Reload to try again.</p>
      <button className="button button-primary" type="button" onClick={() => window.location.reload()}>Reload BluePrinted</button>
    </main>;
  }
}
