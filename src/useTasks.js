import { MAX_TASK_STATUS_LENGTH, DEFAULT_TASK_STATUS, normalizeTaskStatus } from "./taskStatuses";
import { logEvent, logError } from "./diagnostics";
import { useState } from "react";

const KEY = "task-log:v1";

export function branchIds(tasks, rootId) {
  const ids = new Set([rootId]);
  let size;

  do {
    size = ids.size;
    tasks.forEach(task => {
      if (ids.has(task.parentId)) ids.add(task.id);
    });
  } while (size !== ids.size);

  return ids;
}

export function applyTaskChanges(tasks, id, changes) {
  const completedBranch = changes.done === true ? branchIds(tasks, id) : null;
  return tasks.map(task => {
    if (task.id === id) {
      const next = { ...task, ...changes };
      if (next.done) next.pinned = false;
      return next;
    }
    if (completedBranch?.has(task.id)) return { ...task, done: true, pinned: false };
    return task;
  });
}

// Project one status into a valid tree, preserving the nearest retained ancestor.
// The source list is never mutated. Also used when deleting completed parents.
export function tasksByStatus(tasks, done) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const kept = tasks.filter(task => task.done === done);
  const ids = new Set(kept.map(task => task.id));
  return kept.map(task => {
    let parentId = task.parentId;
    const visited = new Set([task.id]);
    while (parentId !== null && !ids.has(parentId)) {
      if (visited.has(parentId)) { parentId = null; break; }
      visited.add(parentId);
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return parentId === task.parentId ? task : { ...task, parentId };
  });
}

// Promote pinned branches without changing parent links or stored creation order.
export function pinnedBranchIds(tasks) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const promoted = new Set();
  for (const task of tasks) {
    if (!task.pinned || task.done) continue;
    let current = task;
    while (current && !promoted.has(current.id)) {
      promoted.add(current.id);
      current = byId.get(current.parentId);
    }
  }
  return promoted;
}

export function validate(data) {
  if (data?.version !== 1 || !Array.isArray(data.tasks)) {
    throw new Error("Неверный формат резервной копии.");
  }

  const map = new Map();

  for (const task of data.tasks) {
    if (
      !task ||
      typeof task.id !== "string" ||
      !task.id ||
      map.has(task.id) ||
      typeof task.title !== "string" ||
      !task.title.trim() ||
      typeof task.notes !== "string" ||
      typeof task.done !== "boolean" ||
      (task.pinned !== undefined && typeof task.pinned !== "boolean") ||
      (task.status !== undefined && (typeof task.status !== "string" || !task.status.trim() || task.status.length > MAX_TASK_STATUS_LENGTH)) ||
      typeof task.collapsed !== "boolean" ||
      typeof task.createdAt !== "string" ||
      !Number.isFinite(Date.parse(task.createdAt)) ||
      !(task.parentId === null || typeof task.parentId === "string")
    ) {
      throw new Error("Резервная копия содержит некорректные задачи.");
    }

    map.set(task.id, task);
  }

  for (const task of data.tasks) {
    const visited = new Set([task.id]);
    let parentId = task.parentId;

    while (parentId !== null) {
      if (!map.has(parentId) || visited.has(parentId)) {
        throw new Error("Нарушена структура дерева задач.");
      }

      visited.add(parentId);
      parentId = map.get(parentId).parentId;
    }
  }

  return data.tasks;
}

function readInitial() {
  try {
    const raw = localStorage.getItem(KEY);
    return {
      tasks: raw ? validate(JSON.parse(raw)) : [],
      error: "",
      blocked: false
    };
  } catch (error) {
    logError("local_read_failed", error);
    return {
      tasks: [],
      error:
        "Не удалось прочитать сохранение. Исходные данные не перезаписаны. " +
        "Проверьте доступ браузера к хранилищу или восстановите резервную копию.",
      blocked: true
    };
  }
}

export default function useTasks() {
  const [initial] = useState(readInitial);
  const [tasks, setTasks] = useState(initial.tasks);
  const [error, setError] = useState(initial.error);
  const [blocked, setBlocked] = useState(initial.blocked);

  function commit(next, recovery = false) {
    if (blocked && !recovery) return false;

    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, tasks: next }));
      setTasks(next);
      setError("");
      setBlocked(false);
      logEvent("local_saved");
      return true;
    } catch (error) {
      logError("local_save_failed", error);
      setError("Сохранение не удалось. Изменение не применено. Экспортируйте копию.");
      return false;
    }
  }

  function add(title, parentId = null, status = DEFAULT_TASK_STATUS) {
    const id = crypto.randomUUID();

    const next = tasks.map(task =>
      task.id === parentId ? { ...task, collapsed: false } : task
    );

    next.unshift({
      id,
      parentId,
      title: title.trim(),
      notes: "", status: normalizeTaskStatus(status),
      done: false,
      collapsed: false,
      createdAt: new Date().toISOString()
    });

    return commit(next) ? id : null;
  }

  function update(id, changes) {
    return commit(applyTaskChanges(tasks, id, changes));
  }

  function remove(id) {
    const ids = branchIds(tasks, id);
    return commit(tasks.filter(task => !ids.has(task.id)));
  }

  function clearCompleted() {
    return commit(tasksByStatus(tasks, false));
  }

  function restore(data) {
    return commit(validate(data), true);
  }

  return { tasks, error, blocked, add, update, remove, restore, clearCompleted };
}