import React, { useState } from "react";
import { MAX_TASK_LINK_LENGTH, validTaskLink, taskLinkHref } from "../taskLink";

export default function TaskLinkInput({ value, savedValue, disabled, onChange }) {
  const [editing, setEditing] = useState(false);
  const invalid = !validTaskLink(value.trim());
  const href = taskLinkHref(savedValue);
  const showInput = !href || editing || value !== (savedValue || '');
  return <div className="task-link-field">
    <label htmlFor={showInput ? "task-link" : undefined}>Ссылка <span className="hint">(необязательно)</span></label>
    {href && <div className="task-link-display">
      <a className="task-link-open" href={href} target="_blank" rel="noopener noreferrer"
        title="Открыть ссылку в новой вкладке">{href} ↗</a>
      <button type="button" disabled={disabled} onClick={() => {
        if (showInput) onChange(savedValue || "");
        setEditing(!showInput);
      }} aria-expanded={showInput}>{showInput ? "Отменить" : "Изменить"}</button>
    </div>}
    {showInput && <>
      <input id="task-link" type="url" value={value} disabled={disabled}
        maxLength={MAX_TASK_LINK_LENGTH} placeholder="https://…"
        aria-invalid={invalid} aria-describedby={invalid ? "task-link-error" : "task-link-hint"}
        onChange={event => onChange(event.target.value)} />
      {invalid ? <p id="task-link-error" className="hint" role="alert">Введите ссылку, начинающуюся с https:// или http://, без логина и пароля в адресе.</p>
        : <p id="task-link-hint" className="hint">После изменения адреса нажмите «Сохранить изменения». Для удаления ссылки очистите поле.</p>}
    </>}
  </div>;
}
