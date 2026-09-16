import { useState } from "react";
import { logError } from "./diagnostics";

export default function useTaskExpansion(tasks, scope) {
  const key = "task-log:collapsed:" + scope;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
      return Object.fromEntries(Object.entries(stored).filter(([, value]) => typeof value === "boolean"));
    } catch { return {}; }
  });
  function set(id, value) {
    const next = { ...collapsed, [id]: value };
    setCollapsed(next);
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch (error) { logError("local_save_failed", error); }
  }
  return {
    tasks: tasks.map(task => Object.hasOwn(collapsed, task.id) ? { ...task, collapsed: collapsed[task.id] } : task),
    set,
    expand: id => { if (id !== null && id !== undefined) set(id, false); }
  };
}
