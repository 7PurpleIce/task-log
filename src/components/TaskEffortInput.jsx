import React from 'react';

export default function TaskEffortInput({ value, error, disabled, onChange }) {
  return <div className="task-effort-field">
    <label htmlFor="task-hours">Трудозатраты, ч <span className="hint">(необязательно)</span></label>
    <input id="task-hours" type="text" inputMode="decimal" value={value ?? ''}
      disabled={disabled} placeholder="Например, 1,5" maxLength={24}
      aria-invalid={Boolean(error)} aria-describedby={error ? 'task-hours-error' : 'task-hours-hint'}
      onChange={event => onChange(event.target.value)} />
    {error ? <p id="task-hours-error" className="hint" role="alert">{error}</p>
      : <p id="task-hours-hint" className="hint">Потраченное время на эту задачу в часах. 1,5 ч = 1 ч 30 мин.</p>}
  </div>;
}
