import { validate } from './model.js';

export const LOCAL_TASKS_KEY = 'task-log:v1';
const LOCK = 'task-log:write';

export function readLocalTasks(storage) {
  const raw = storage.getItem(LOCAL_TASKS_KEY);
  if (!raw) return { tasks: [], revision: 0 };
  const data = JSON.parse(raw);
  const tasks = validate(data);
  const revision = data.revision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Некорректная версия локального сохранения.');
  return { tasks, revision };
}

// Every tab takes the same lock and applies its operation to the latest document.
export async function writeLocalTasks(storage, locks, transform, recovery = false) {
  if (!locks?.request) throw new Error('Браузер не поддерживает безопасное сохранение между вкладками. Обновите браузер или используйте облачный аккаунт.');
  return locks.request(LOCK, async () => {
    let current;
    try { current = readLocalTasks(storage); }
    catch (error) { if (!recovery) throw error; current = { tasks: [], revision: 0 }; }
    const tasks = validate({ version: 1, tasks: transform(current.tasks) });
    const next = { version: 1, revision: current.revision + 1, tasks };
    if (!Number.isSafeInteger(next.revision)) throw new Error('Некорректная версия сохранения.');
    storage.setItem(LOCAL_TASKS_KEY, JSON.stringify(next));
    return next;
  });
}
