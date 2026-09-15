import { readCloudUpdate } from "./tasks/cloudRepository";
import { DEFAULT_TASK_STATUS } from "./taskStatuses";
import { logEvent, logError } from "./diagnostics";
import { useEffect, useRef, useState } from "react";
import { createTask, updateTask, removeTask, validate, tasksByStatus } from "./tasks/model";
import { cloudRequest } from "./cloud";

export default function useCloudTasks(owner) {
  const [doc, setDoc] = useState({ tasks: [], revision: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Загрузка облачных задач…");
  const current = useRef(doc);
  const loaded = useRef(false);
  const writing = useRef(false);
  const reading = useRef(false);
  const active = useRef(true);
  const epoch = useRef(0);

  function accept(next) {
    validate({ version: 1, tasks: next.tasks });
    if (!Number.isSafeInteger(next.revision) || next.revision < 0) {
      throw new Error("Некорректная версия облачного сохранения.");
    }
    current.current = next;
    setDoc(next);
    loaded.current = true;
    setReady(true);
  }

  async function pull() {
    if (!owner || writing.current || reading.current || !active.current) return;
    reading.current = true;
    const start = epoch.current;
    try {
      const next = await readCloudUpdate(cloudRequest, owner, current.current, loaded.current,
        () => active.current && start === epoch.current);
      if (!active.current || start !== epoch.current) return;
      if (next) accept(next);
      setStatus("Синхронизировано");
      // Write errors stay visible until a successful write or explicit dismissal.
    } catch (err) {
      if (active.current && start === epoch.current) {
        logError("sync_failed", err);
        setStatus(err.message);
      }
    } finally { reading.current = false; }
  }

  useEffect(() => {
    active.current = true;
    if (!owner) return;
    pull();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") pull();
    }, 5000);
    const visible = () => {
      if (document.visibilityState === "visible") pull();
    };
    window.addEventListener("focus", pull);
    window.addEventListener("online", pull);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active.current = false;
      epoch.current++;
      clearInterval(timer);
      window.removeEventListener("focus", pull);
      window.removeEventListener("online", pull);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [owner]);

  async function commit(next, expectedRevision = doc.revision) {
    if (!ready || writing.current || !active.current) return false;
    writing.current = true;
    epoch.current++;
    setBusy(true);
    setStatus("Сохранение…");
    try {
      validate({ version: 1, tasks: next });
      const saved = await cloudRequest(owner, "rpc/save_task_log", {
        method: "POST", body: { expected_revision: expectedRevision, next_tasks: next }
      });
      if (!active.current) return false;
      accept(saved);
      logEvent("cloud_saved", "info", { revision: saved.revision });
      setError("");
      setStatus("Синхронизировано");
      return true;
    } catch (err) {
      if (active.current) {
        logError(err.code === "40001" ? "conflict" : "save_failed", err, { revision: expectedRevision });
        setError(err.code === "40001"
          ? "На другом устройстве появились изменения. Данные обновятся автоматически. Проверьте их и повторите действие; текст в редакторе сохранён."
          : err.message + " Изменение не подтверждено. Проверьте данные перед повторной отправкой.");
        setStatus("Не удалось подтвердить сохранение");
      }
      return false;
    } finally {
      writing.current = false;
      if (active.current) setBusy(false);
    }
  }

  async function mutate(transform) {
    try { return await commit(transform(doc.tasks)); }
    catch (err) { logError("save_failed", err); setError(err.message); return false; }
  }

  async function add(title, parentId = null, status = DEFAULT_TASK_STATUS, dueDate = null) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    return await mutate(tasks => createTask(tasks, { title, parentId, status, dueDate }, id, createdAt)) ? id : null;
  }

  function update(id, changes, original) {
    return mutate(tasks => updateTask(tasks, id, changes, original));
  }

  function remove(id) {
    return mutate(tasks => removeTask(tasks, id));
  }

  function clearCompleted() {
    return commit(tasksByStatus(doc.tasks, false));
  }

  async function restore(data) {
    try { return await commit(validate(data)); }
    catch (err) { logError("import_failed", err); setError(err.message); return false; }
  }

  return { tasks: doc.tasks, error, blocked: !ready || busy, busy, ready,
    status, add, update, remove, restore, clearCompleted, refresh: pull };
}

