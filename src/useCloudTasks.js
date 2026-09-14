import { logEvent, logError } from "./diagnostics";
import { useEffect, useRef, useState } from "react";
import { branchIds, validate, applyTaskChanges } from "./useTasks";
import { cloudRequest } from "./cloud";

export default function useCloudTasks(owner) {
  const [doc, setDoc] = useState({ tasks: [], revision: 0 });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Загрузка облачных задач…");
  const current = useRef(doc);
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
    setReady(true);
  }

  async function pull() {
    if (!owner || writing.current || reading.current || !active.current) return;
    reading.current = true;
    const start = epoch.current;
    try {
      const rows = await cloudRequest(owner, "task_logs?select=tasks,revision&user_id=eq." + encodeURIComponent(owner));
      if (!active.current || start !== epoch.current) return;
      const next = rows[0] || { tasks: [], revision: 0 };
      if (next.revision >= current.current.revision) accept(next);
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

  async function add(title, parentId = null) {
    if (!title.trim()) return null;
    if (parentId !== null && !doc.tasks.some(t => t.id === parentId)) {
      setError("Родительская задача удалена. Выберите другую.");
      return null;
    }
    const id = crypto.randomUUID();
    const next = doc.tasks.map(t => t.id === parentId ? { ...t, collapsed: false } : t);
    next.unshift({ id, parentId, title: title.trim(), notes: "", done: false,
      collapsed: false, createdAt: new Date().toISOString() });
    return await commit(next) ? id : null;
  }

  async function update(id, changes, original) {
    const task = doc.tasks.find(t => t.id === id);
    if (!task) { setError("Задача уже удалена."); return false; }
    if (original && (original.title !== task.title || original.notes !== task.notes)) {
      logEvent("conflict", "warn");
      setError("Название или заметки изменены на другом устройстве. Скопируйте свой черновик, затем нажмите «Загрузить актуальное».");
      return false;
    }
    return commit(applyTaskChanges(doc.tasks, id, changes));
  }

  function remove(id) {
    const ids = branchIds(doc.tasks, id);
    return commit(doc.tasks.filter(t => !ids.has(t.id)));
  }

  async function restore(data) {
    try { return await commit(validate(data)); }
    catch (err) { logError("import_failed", err); setError(err.message); return false; }
  }

  return { tasks: doc.tasks, error, blocked: !ready || busy, busy, ready,
    status, add, update, remove, restore, refresh: pull };
}
