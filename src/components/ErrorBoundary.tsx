import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("HYBRID 7r feil:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ maxWidth: 640, margin: "60px auto", padding: 24, fontFamily: "system-ui, sans-serif", color: "#eef1f4" }}>
          <h2 style={{ marginBottom: 8 }}>Noko gjekk gale</h2>
          <p style={{ color: "#98a2af", marginBottom: 12 }}>
            Appen møtte ein feil og kunne ikkje teikne. Prøv å laste sida på nytt. Teknisk detalj:
          </p>
          <pre style={{ whiteSpace: "pre-wrap", background: "#13171d", border: "1px solid #2a313c", borderRadius: 8, padding: 12, fontSize: 12 }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => location.reload()}
            style={{ marginTop: 12, padding: "8px 14px", borderRadius: 9, border: "1px solid #2a313c", background: "#6ea8fe", color: "#06101f", cursor: "pointer" }}
          >
            Last på nytt
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
