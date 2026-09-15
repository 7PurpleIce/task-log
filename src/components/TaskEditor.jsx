import useTaskDraft from "../useTaskDraft";
import { branchIds, taskFields, sameFields } from "../tasks/model";
import { normalizeTaskStatus } from "../taskStatuses";
import TaskStatusInput from "./TaskStatusInput";
import React, { useState } from "react";

export default function TaskEditor({
  task, tasks, onUpdate, onAdd, onDelete, disabled, drafts
}) {
  const { values, baseline, dirty, change, reset } = useTaskDraft(task, drafts);
  const { title, notes, status, dueDate } = values;
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const remoteChanged = !sameFields(baseline, task);
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
        reset({ title: title.trim(), notes, status: normalizeTaskStatus(status), dueDate: dueDate || null });
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
            reset(taskFields(task)); setSaved(false);
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
            change({ title: event.target.value });
            setSaved(false);
          }}
        />

        <label htmlFor="task-status">Статус</label>
        <TaskStatusInput
          id="task-status"
          value={status}
          disabled={pending}
          onChange={event => {
            change({ status: event.target.value });
            setSaved(false);
          }}
        />

        <label htmlFor="task-due-date">Крайний срок</label>
        <input id="task-due-date" type="date" min="1000-01-01" max="9999-12-31"
          value={dueDate || ""} disabled={pending}
          onChange={event => { change({ dueDate: event.target.value }); setSaved(false); }} />
        {dueDate && <button type="button" disabled={pending}
          onClick={() => { change({ dueDate: null }); setSaved(false); }}>Убрать срок</button>}
        <p className="hint">До конца выбранного дня по времени вашего устройства.</p>

        <label htmlFor="task-notes">Заметки</label>
        <textarea
          id="task-notes"
          disabled={pending}
          value={notes}
          rows={8}
          placeholder="Детали, результаты, ссылки…"
          onChange={event => {
            change({ notes: event.target.value });
            setSaved(false);
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
