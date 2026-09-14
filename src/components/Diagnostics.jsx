import React from "react";
import { logError } from "../diagnostics";

export class DiagnosticBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { logError("render_error", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="app">
      <h1>Не удалось отобразить приложение</h1>
      <p>Попробуйте обновить страницу.</p>
      <button onClick={() => location.reload()}>Обновить страницу</button>
    </div>;
  }
}
