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
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [baseline, setBaseline] = useState({ title: task.title, notes: task.notes, status: getTaskStatus(task) });
  useEffect(() => {
    if (!dirty) {
      setTitle(task.title);
      setNotes(task.notes);
      setStatus(getTaskStatus(task));
      setBaseline({ title: task.title, notes: task.notes, status: getTaskStatus(task) });
    }
  }, [task.title, task.notes, task.status, dirty]);
  const remoteChanged = baseline.title !== task.title || baseline.notes !== task.notes || baseline.status !== getTaskStatus(task);
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
      const ok = await onUpdate(task.id, { title: title.trim(), notes, status: normalizeTaskStatus(status) }, baseline);
      setSaved(Boolean(ok));
      if (ok) {
        setBaseline({ title: title.trim(), notes, status: normalizeTaskStatus(status) });
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