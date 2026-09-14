import React, { useEffect, useState } from "react";
import { EVENTS, getDiagnostics, clearDiagnostics, downloadDiagnostics, logError } from "../diagnostics";

export default function Diagnostics() {
  const [report, setReport] = useState(getDiagnostics);
  useEffect(() => {
    const refresh = () => setReport(getDiagnostics());
    window.addEventListener("task-log-diagnostics", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("task-log-diagnostics", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return <details style={{ marginTop: 16, padding: 16, border: "1px solid var(--line)" }}>
    <summary style={{ cursor: "pointer" }}>Журнал диагностики ({report.entries.length})</summary>
    <p className="hint">Последние 300 событий в этом браузере. Пароли, email, токены и текст задач не записываются. Журнал отправляется только при скачивании и передаче файла вами.</p>
    {!report.persistent && <p role="status">Хранилище недоступно: журнал временно хранится только в памяти.</p>}
    <div className="backup-actions">
      <button type="button" onClick={downloadDiagnostics}>Скачать журнал</button>
      <button type="button" onClick={() => {
        if (window.confirm("Очистить журнал диагностики? Задачи останутся на месте.")) clearDiagnostics();
      }}>Очистить журнал</button>
    </div>
    <div style={{ maxHeight: 320, overflow: "auto", marginTop: 12 }}>
      {report.entries.length === 0 && <p>Событий пока нет.</p>}
      {report.entries.slice().reverse().map((e, i) => <div key={i}
        style={{ padding: "10px 0", borderBottom: "1px solid var(--line)", overflowWrap: "anywhere" }}>
        <span style={{ color: e.level === "error" ? "#ffaaa0" : "var(--muted)" }}>
          {new Date(e.time).toLocaleString()} · {e.level.toUpperCase()}
        </span>
        <div>{EVENTS[e.event]}</div>
        <code style={{ fontSize: 13 }}>{JSON.stringify(e.meta)}</code>
      </div>)}
    </div>
  </details>;
}

export class DiagnosticBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { logError("render_error", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="app">
      <h1>Не удалось отобразить приложение</h1>
      <p>Скачайте журнал для диагностики, затем обновите страницу.</p>
      <button onClick={() => location.reload()}>Обновить страницу</button>
      <Diagnostics />
    </div>;
  }
}
