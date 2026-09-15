import React, { useEffect, useState } from "react";
import TaskTree from "./TaskTree";
import { tasksByStatus } from "../tasks/model";

export default function TaskSections({ tasks, onClearCompleted, ...treeProps }) {
  const [sortOrder, setSortOrder] = useState("default");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); window.removeEventListener("focus", tick); document.removeEventListener("visibilitychange", tick); };
  }, []);
  const active = tasksByStatus(tasks, false);
  const completed = tasksByStatus(tasks, true);
  return <>
    <label className="deadline-sort">Сортировка
      <select value={sortOrder} onChange={event => setSortOrder(event.target.value)}>
        <option value="default">Новые сверху</option>
        <option value="asc">Ближайший срок</option>
        <option value="desc">Дальний срок</option>
      </select>
    </label>
    <section aria-labelledby="active-tasks-heading">
      <h2 id="active-tasks-heading">В работе <span className="count">({active.length})</span></h2>
      <TaskTree {...treeProps} sortOrder={sortOrder} now={now} tasks={active}
        emptyTitle={tasks.length ? "Все задачи выполнены" : "Начните с главной задачи"}
        emptyDescription={tasks.length ? "Завершённые задачи находятся в разделе ниже." : "Затем добавляйте ветки и подзадачи кнопкой «＋»."} />
    </section>
    <section aria-labelledby="completed-tasks-heading"
      style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
      <div className="section-heading">
        <h2 id="completed-tasks-heading">Выполненные <span className="count">({completed.length})</span></h2>
        <button type="button" className="danger"
          aria-label="Удалить выполненные задачи" title="Удалить выполненные задачи"
          disabled={treeProps.disabled || completed.length === 0}
          onClick={() => {
            if (window.confirm("Удалить выполненные задачи?")) onClearCompleted();
          }}
          style={{ display: "grid", placeItems: "center", width: 44, height: 44, padding: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
          </svg>
        </button>
      </div>
      <TaskTree {...treeProps} sortOrder={sortOrder} now={now} tasks={completed}
        emptyTitle="Выполненных задач пока нет"
        emptyDescription="Отметьте задачу галочкой, и она появится здесь." />
    </section>
  </>;
}

