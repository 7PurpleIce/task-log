import { getTaskStatus, normalizeTaskStatus } from "../taskStatuses";
import TaskStatusInput from "./TaskStatusInput";
import React, { useEffect, useState } from "react";
import { branchIds } from "../useTasks";

export default function TaskEditor({
  task, tasks, onUpdate, onAdd, onDelete, disabled
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [status, setStatus] = useState(getTaskStatus(task));
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [baseline, setBaseline] = useState({ title: task.title, notes: task.notes, status: getTaskStatus(task), dueDate: task.dueDate || null });
  useEffect(() => {
    if (!dirty) {
      setTitle(task.title);
      setNotes(task.notes);
      setStatus(getTaskStatus(task));
      setDueDate(task.dueDate || "");
      setBaseline({ title: task.title, notes: task.notes, status: getTaskStatus(task), dueDate: task.dueDate || null });
    }
  }, [task.title, task.notes, task.status, task.dueDate, dirty]);
  const remoteChanged = baseline.title !== task.title || baseline.notes !== task.notes || baseline.status !== getTaskStatus(task) || baseline.dueDate !== (task.dueDate || null);
  const branch = branchIds(tasks, task.id);

  const descendants = tasks.filter(item =>
    item.id !== task.id && branch.has(item.id)
  );
  const completed = descendants.filter(item => item.done).length;

  async function submit(event) {
    event.preventDefault();
    if (!title.trim() || pending || disabled) return;
    setPending(true);
    try {
      const ok = await onUpdate(task.id, { title: title.trim(), notes, status: normalizeTaskStatus(status), dueDate: dueDate || null }, baseline);
      setSaved(Boolean(ok));
      if (ok) {
        setBaseline({ title: title.trim(), notes, status: normalizeTaskStatus(status), dueDate: dueDate || null });
        setDirty(false);
      }
    } finally { setPending(false); }
  }

  return (
    <aside className="editor">
      <div className="eyebrow">Карточка задачи</div>

      {dirty && remoteChanged && <div className="alert" role="alert">
        Задача изменена на другом устройстве. Ваш черновик сохранён в редакторе.
        <button onClick={() => {
          if (window.confirm("Заменить черновик актуальными данными?")) {
            setDirty(false); setSaved(false);
          }
        }}>Загрузить актуальное</button>
      </div>}
      <form onSubmit={submit}>
        <label htmlFor="task-title">Название</label>
        <input
          id="task-title"
          disabled={pending}
          value={title}
          required
          maxLength={300}
          onChange={event => {
            setTitle(event.target.value);
            setSaved(false);
            setDirty(true);
          }}
        />

        <label htmlFor="task-status">Статус</label>
        <TaskStatusInput
          id="task-status"
          value={status}
          disabled={pending}
          onChange={event => {
            setStatus(event.target.value);
            setSaved(false);
            setDirty(true);
          }}
        />

        <label htmlFor="task-due-date">Крайний срок</label>
        <input id="task-due-date" type="date" min="1000-01-01" max="9999-12-31"
          value={dueDate} disabled={pending}
          onChange={event => { setDueDate(event.target.value); setSaved(false); setDirty(true); }} />
        {dueDate && <button type="button" disabled={pending}
          onClick={() => { setDueDate(""); setSaved(false); setDirty(true); }}>Убрать срок</button>}
        <p className="hint">До конца выбранного дня по времени вашего устройства.</p>

        <label htmlFor="task-notes">Заметки</label>
        <textarea
          id="task-notes"
          disabled={pending}
          value={notes}
          rows={8}
          placeholder="Детали, результаты, ссылки…"
          onChange={event => {
            setNotes(event.target.value);
            setSaved(false);
            setDirty(true);
          }}
        />

        <button className="primary" type="submit" disabled={disabled || pending}>
          Сохранить изменения
        </button>
        <span className="save-note" role="status">
          {saved ? "Сохранено" : ""}
        </span>
      </form>

      <div className="detail">
        <span>Создана</span>
        <span>{new Date(task.createdAt).toLocaleDateString("ru-RU")}</span>
      </div>

      {descendants.length > 0 && (
        <>
          <div className="detail">
            <span>Подзадачи всей ветки</span>
            <span>{completed} / {descendants.length}</span>
          </div>
          <progress value={completed} max={descendants.length} />
        </>
      )}

      <p className="hint">
        Отметка «Выполнено» завершает задачу и все её подзадачи. Снятие галочки открывает только выбранную задачу.
      </p>

      <button className="wide" disabled={disabled || pending} onClick={() => onAdd(task.id)}>
        ＋ Добавить подзадачу
      </button>

      <button
        className="danger wide"
        disabled={disabled || pending}
        onClick={() => {
          const message = descendants.length
            ? `Удалить «${task.title}» и все подзадачи (${descendants.length})?`
            : `Удалить «${task.title}»?`;

          if (window.confirm(message)) onDelete(task.id);
        }}
      >
        Удалить {descendants.length ? "ветку" : "задачу"}
      </button>
    </aside>
  );
}