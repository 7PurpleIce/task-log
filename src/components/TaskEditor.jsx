import React, { useState } from "react";
import { branchIds } from "../useTasks";

export default function TaskEditor({
  task, tasks, onUpdate, onAdd, onDelete
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [saved, setSaved] = useState(false);

  const descendants = tasks.filter(item =>
    item.id !== task.id && branchIds(tasks, task.id).has(item.id)
  );
  const completed = descendants.filter(item => item.done).length;

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;

    setSaved(Boolean(onUpdate(task.id, {
      title: title.trim(),
      notes
    })));
  }

  return (
    <aside className="editor">
      <div className="eyebrow">Карточка задачи</div>

      <form onSubmit={submit}>
        <label htmlFor="task-title">Название</label>
        <input
          id="task-title"
          value={title}
          required
          maxLength={300}
          onChange={event => {
            setTitle(event.target.value);
            setSaved(false);
          }}
        />

        <label htmlFor="task-notes">Заметки</label>
        <textarea
          id="task-notes"
          value={notes}
          rows={8}
          placeholder="Детали, результаты, ссылки…"
          onChange={event => {
            setNotes(event.target.value);
            setSaved(false);
          }}
        />

        <button className="primary" type="submit">
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
        Отметка выполнения относится только к выбранной задаче.
      </p>

      <button className="wide" onClick={() => onAdd(task.id)}>
        ＋ Добавить подзадачу
      </button>

      <button
        className="danger wide"
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