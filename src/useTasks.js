import { useEffect, useRef, useState } from 'react';
import { logEvent, logError } from './diagnostics';
import { createTask, updateTask, removeTask, moveTask, tasksByStatus, validate } from './tasks/model';
import { LOCAL_TASKS_KEY, readLocalTasks, writeLocalTasks } from './tasks/localRepository';

function initialState() {
  try { return { tasks: readLocalTasks(localStorage).tasks, error: '', blocked: false }; }
  catch (error) {
    logError('local_read_failed', error);
    return { tasks: [], error: 'Не удалось прочитать локальное сохранение. Восстановите резервную копию; исходные данные не перезаписаны.', blocked: true };
  }
}

export default function useTasks() {
  const [state, setState] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const refresh = event => {
      if (event && event.key !== null && event.key !== LOCAL_TASKS_KEY) return;
      setState(initialState());
    };
    window.addEventListener('storage', refresh);
    return () => { mounted.current = false; window.removeEventListener('storage', refresh); };
  }, []);

  async function commit(transform, recovery = false) {
    if (writing.current || (state.blocked && !recovery)) return false;
    writing.current = true;
    setBusy(true);
    try {
      await writeLocalTasks(localStorage, navigator.locks, transform, recovery);
      if (mounted.current) setState(initialState());
      logEvent('local_saved');
      return true;
    } catch (error) {
      logError('local_save_failed', error);
      if (mounted.current) setState(value => ({ ...value, error: error.message + ' Изменение не применено.' }));
      return false;
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function add(title, parentId = null, status, dueDate = null) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    return await commit(tasks => createTask(tasks, { title, parentId, status, dueDate }, id, createdAt)) ? id : null;
  }
  return { tasks: state.tasks, error: state.error, blocked: state.blocked || busy,
    add,
    update: (id, changes, original) => commit(tasks => updateTask(tasks, id, changes, original)),
    move: (id, parentId, expectedParentId) => commit(tasks => moveTask(tasks, id, parentId, expectedParentId)),
    remove: id => commit(tasks => removeTask(tasks, id)),
    clearCompleted: () => commit(tasks => tasksByStatus(tasks, false)),
    restore: data => commit(() => validate(data), true) };
}
