import { pinnedBranchIds } from "../useTasks";
import { getTaskStatus } from "../taskStatuses";
import React from "react";

export default function TaskTree({
  tasks, selectedId, onSelect, onUpdate, onAdd, disabled,
  emptyTitle = "Начните с главной задачи",
  emptyDescription = "Затем добавляйте ветки и подзадачи кнопкой «＋»."
}) {
  const children = new Map();

  tasks.forEach(task => {
    if (!children.has(task.parentId)) children.set(task.parentId, []);
    children.get(task.parentId).push(task);
  });

  const promoted = pinnedBranchIds(tasks);
  for (const siblings of children.values()) {
    siblings.sort((a, b) => Number(promoted.has(b.id)) - Number(promoted.has(a.id)));
  }

  const rows = [];
  const stack = [...(children.get(null) || [])]
    .reverse()
    .map(task => ({ task, depth: 0 }));

  while (stack.length) {
    const entry = stack.pop();
    rows.push(entry);

    if (!entry.task.collapsed) {
      const nested = children.get(entry.task.id) || [];

      for (let i = nested.length - 1; i >= 0; i--) {
        stack.push({ task: nested[i], depth: entry.depth + 1 });
      }
    }
  }

  if (!tasks.length) {
    return (
      <div className="empty">
        <span className="empty-mark">＋</span>
        <h2>{emptyTitle}</h2>
        <p>{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="tree" aria-label="Дерево задач">
      {rows.map(({ task, depth }) => {
        const nested = children.get(task.id) || [];

        return (
          <div
            key={task.id}
            className={`task-row ${selectedId === task.id ? "selected" : ""}`}
            style={{ marginLeft: depth * 24 }}
          >
            <button
              className="icon"
              disabled={disabled || !nested.length}
              aria-label={task.collapsed ? "Развернуть ветку" : "Свернуть ветку"}
              aria-expanded={nested.length ? !task.collapsed : undefined}
              onClick={() => onUpdate(task.id, {
                collapsed: !task.collapsed
              })}
            >
              {nested.length ? (task.collapsed ? "›" : "⌄") : "·"}
            </button>

            <input
              type="checkbox"
              disabled={disabled}
              checked={task.done}
              aria-label={`Выполнено: ${task.title}`}
              onChange={() => onUpdate(task.id, { done: !task.done })}
            />

            <button
              className={`task-title ${task.done ? "done" : ""}`}
              aria-pressed={selectedId === task.id}
              onClick={() => onSelect(task.id)}
            >
              <span className="task-name">{task.title}</span>
            </button>

            {nested.length > 0 && (
              <span className="count" title="Выполнено прямых подзадач">
                {nested.filter(item => item.done).length}/{nested.length}
              </span>
            )}

            <span className="task-status" title={`Статус: ${getTaskStatus(task)}`}>
              {getTaskStatus(task)}
            </span>

            <button
              type="button"
              className="icon pin-task"
              disabled={disabled || task.done}
              aria-label={task.pinned && !task.done ? "Открепить задачу" : "Закрепить задачу"}
              title={task.done ? "Выполненные задачи нельзя закрепить" : task.pinned ? "Открепить задачу" : "Закрепить задачу"}
              aria-pressed={Boolean(task.pinned && !task.done)}
              onClick={() => onUpdate(task.id, { pinned: !task.pinned })}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M9 3h6l-1 7 4 4v2H6v-2l4-4-1-7ZM12 16v5" />
                {task.pinned && !task.done && <path d="m3 3 18 18" />}
              </svg>
            </button>

            <button
              className="icon add-child"
              disabled={disabled}
              aria-label={`Добавить подзадачу к «${task.title}»`}
              onClick={() => onAdd(task.id)}
            >
              ＋
            </button>
          </div>
        );
      })}
    </div>
  );
}