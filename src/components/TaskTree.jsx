import { deadlineInfo, compareDeadlines } from "../deadlines";
import { pinnedBranchIds } from "../tasks/model";
import TaskRow from "./TaskRow";
import React from "react";

export default function TaskTree({
  tasks, selectedId, onSelect, onUpdate, onAdd, disabled, movement, sortOrder = "default", now = new Date(),
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
    siblings.sort((a, b) => Number(promoted.has(b.id)) - Number(promoted.has(a.id)) || compareDeadlines(a, b, sortOrder));
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

        const deadline = deadlineInfo(task, now);
        return <TaskRow movement={movement} key={task.id} task={task} depth={depth} nested={nested} deadline={deadline}
          selectedId={selectedId} disabled={disabled} onUpdate={onUpdate} onSelect={onSelect} onAdd={onAdd} />;
      })}
    </div>
  );
}
