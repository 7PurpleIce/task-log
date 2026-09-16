import { validDueDate } from "../deadlines.js";
import { MAX_TASK_STATUS_LENGTH, DEFAULT_TASK_STATUS, normalizeTaskStatus, getTaskStatus } from "../taskStatuses.js";

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
  const changedBranch = typeof changes.done === "boolean" ? branchIds(tasks, id) : null;
  return tasks.map(task => {
    if (task.id === id) {
      const next = { ...task, ...changes };
      if (next.done) next.pinned = false;
      return next;
    }
    if (changedBranch?.has(task.id)) {
      return { ...task, done: changes.done, ...(changes.done ? { pinned: false } : {}) };
    }
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
      !validDueDate(task.dueDate) ||
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


export function taskFields(task) {
  return { title: task.title, notes: task.notes, status: getTaskStatus(task), dueDate: task.dueDate || null };
}

export function sameFields(a, b) {
  return a.title === b.title && a.notes === b.notes && getTaskStatus(a) === getTaskStatus(b) &&
    (a.dueDate || null) === (b.dueDate || null);
}

export function createTask(tasks, { title, parentId = null, status = DEFAULT_TASK_STATUS, dueDate = null }, id, createdAt) {
  if (!title.trim()) throw new Error("Введите название задачи.");
  if (parentId !== null && !tasks.some(task => task.id === parentId)) {
    throw new Error("Родительская задача удалена. Выберите другую.");
  }
  return [{ id, parentId, title: title.trim(), notes: "", status: normalizeTaskStatus(status),
    dueDate: dueDate || null, done: false, collapsed: false, createdAt },
    ...tasks.map(task => task.id === parentId ? { ...task, collapsed: false } : task)];
}

export function updateTask(tasks, id, changes, original) {
  const task = tasks.find(task => task.id === id);
  if (!task) throw new Error("Задача уже удалена.");
  if (original && !sameFields(original, task)) {
    throw new Error("Задача изменена в другой вкладке или на другом устройстве. Черновик сохранён; проверьте актуальные данные.");
  }
  return applyTaskChanges(tasks, id, changes);
}

export function removeTask(tasks, id) {
  const ids = branchIds(tasks, id);
  return tasks.filter(task => !ids.has(task.id));
}

export function canMoveTask(tasks, id, parentId) {
  const source = tasks.find(task => task.id === id);
  if (!source || source.parentId === parentId) return false;
  if (parentId === null) return true;
  const parent = tasks.find(task => task.id === parentId);
  return Boolean(parent && parent.done === source.done && !branchIds(tasks, id).has(parentId));
}

export function moveTask(tasks, id, parentId, expectedParentId) {
  const source = tasks.find(task => task.id === id);
  if (!source) throw new Error("Перемещаемая задача уже удалена.");
  if (source.parentId !== expectedParentId) throw new Error("Задача уже перемещена в другой вкладке. Повторите перенос.");
  if (!canMoveTask(tasks, id, parentId)) {
    throw new Error("Выберите другую задачу в том же разделе. Нельзя переносить ветку внутрь самой себя.");
  }
  const next = tasks.map(task => {
    if (task.id === id) return { ...task, parentId };
    if (task.id === parentId) return { ...task, collapsed: false };
    return task;
  });
  return validate({ version: 1, tasks: next });
}
