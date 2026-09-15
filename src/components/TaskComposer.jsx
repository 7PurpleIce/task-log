import React from "react";
import TaskStatusInput from "./TaskStatusInput";

export default function TaskComposer({ parent, setParentId, createTask, titleInput,
  newTitle, setNewTitle, newStatus, setNewStatus, newDueDate, setNewDueDate, blocked }) {
  return (
<div className="composer">
            <div className="composer-context">
              <span>
                {parent ? `Подзадача для: ${parent.title}` : "Новая главная задача"}
              </span>
              {parent && (
                <button onClick={() => setParentId(null)}>Отменить</button>
              )}
            </div>

            <form onSubmit={createTask}>
              <input
                ref={titleInput}
                value={newTitle}
                onChange={event => setNewTitle(event.target.value)}
                placeholder="Что нужно сделать?"
                aria-label="Название новой задачи"
                maxLength={300}
                required
                disabled={blocked}
              />
              <TaskStatusInput
                aria-label="Статус новой задачи"
                title="Введите свой этап выполнения"
                value={newStatus}
                onChange={event => setNewStatus(event.target.value)}
                disabled={blocked}
              />
              <label className="composer-deadline">Крайний срок
                <input type="date" min="1000-01-01" max="9999-12-31"
                  value={newDueDate} disabled={blocked}
                  onChange={event => setNewDueDate(event.target.value)} />
              </label>
              <button
                type="submit"
                className="primary"
                disabled={blocked || !newTitle.trim()}
              >
                ＋ Добавить
              </button>
            </form>
          </div>
  );
}
