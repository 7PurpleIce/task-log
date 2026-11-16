import React from "react";
import { MAX_TASK_LINK_LENGTH, validTaskLink, taskLinkHref } from "../taskLink";

export default function TaskLinkInput({ value, savedValue, disabled, onChange }) {
  const invalid = !validTaskLink(value.trim());
  const href = taskLinkHref(savedValue);
  return <div className="task-link-field">
    <label htmlFor="task-link">Ссылка <span className="hint">(необязательно)</span></label>
    <input id="task-link" type="url" value={value} disabled={disabled}
      maxLength={MAX_TASK_LINK_LENGTH} placeholder="https://…"
      aria-invalid={invalid} aria-describedby={invalid ? "task-link-error" : undefined}
      onChange={event => onChange(event.target.value)} />
    {invalid && <p id="task-link-error" className="hint" role="alert">Введите ссылку, начинающуюся с https:// или http://, без логина и пароля в адресе.</p>}
    {href && <a className="task-link-open" href={href} target="_blank" rel="noopener noreferrer"
      title="Открыть сохранённую ссылку в новой вкладке">Открыть ссылку ↗</a>}
  </div>;
}
