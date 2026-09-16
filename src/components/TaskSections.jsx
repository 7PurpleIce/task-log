import useTaskMove from "../useTaskMove";
import React, { useEffect, useState } from "react";
import TaskTree from "./TaskTree";
import { tasksByStatus } from "../tasks/model";

export default function TaskSections({ tasks, onClearCompleted, onMove, ...treeProps }) {
  const movement = useTaskMove(tasks, onMove, treeProps.disabled);
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
    {movement.moving && <div className="move-toolbar" onKeyDown={event => { if (event.key === "Escape") movement.cancel(); }}>
      <span>Перетащите ветку на задачу в том же разделе или нажмите «Поместить сюда».</span>
      <button type="button" {...movement.targetProps(null)}
        className={movement.over === null ? "drop-target" : ""}
        disabled={!movement.allowed(null)} onClick={() => movement.drop(null)}>На верхний уровень</button>
      <button type="button" onClick={movement.cancel}>Отменить перенос</button>
    </div>}
    {movement.message && <p className="hint" role="status">{movement.message}</p>}
    <label className="deadline-sort">Сортировка
      <select value={sortOrder} onChange={event => setSortOrder(event.target.value)}>
        <option value="default">Новые сверху</option>
        <option value="asc">Ближайший срок</option>
        <option value="desc">Дальний срок</option>
      </select>
    </label>
    <section aria-labelledby="active-tasks-heading">
      <h2 id="active-tasks-heading">В работе <span className="count">({active.length})</span></h2>
      <TaskTree {...treeProps} movement={movement} sortOrder={sortOrder} now={now} tasks={active}
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
      <TaskTree {...treeProps} movement={movement} sortOrder={sortOrder} now={now} tasks={completed}
        emptyTitle="Выполненных задач пока нет"
        emptyDescription="Отметьте задачу галочкой, и она появится здесь." />
    </section>
  </>;
}

