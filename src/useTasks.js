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
  } catch {
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
      return true;
    } catch {
      setError("Сохранение не удалось. Изменение не применено. Экспортируйте копию.");
      return false;
    }
  }

  function add(title, parentId = null) {
    const id = crypto.randomUUID();

    const next = tasks.map(task =>
      task.id === parentId ? { ...task, collapsed: false } : task
    );

    next.push({
      id,
      parentId,
      title: title.trim(),
      notes: "",
      done: false,
      collapsed: false,
      createdAt: new Date().toISOString()
    });

    return commit(next) ? id : null;
  }

  function update(id, changes) {
    return commit(
      tasks.map(task => task.id === id ? { ...task, ...changes } : task)
    );
  }

  function remove(id) {
    const ids = branchIds(tasks, id);
    return commit(tasks.filter(task => !ids.has(task.id)));
  }

  function restore(data) {
    return commit(validate(data), true);
  }

  return { tasks, error, blocked, add, update, remove, restore };
}