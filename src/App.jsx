import useTaskExpansion from "./useTaskExpansion";
import { DEFAULT_TASK_STATUS } from "./taskStatuses";
import TaskComposer from "./components/TaskComposer";
import { logError } from "./diagnostics";
import React, { useEffect, useRef, useState } from "react";
import useTasks from "./useTasks";
import TaskSections from "./components/TaskSections";
import TaskEditor from "./components/TaskEditor";

import useCloudTasks from "./useCloudTasks";
import AccountMenu from "./components/AccountMenu";
import { getSession, watchSession, finishAuthRedirect } from "./cloud";

export default function App() {
  const [session, setSession] = useState(getSession);
  const [recovery, setRecovery] = useState(false);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    const unsubscribe = watchSession(setSession);
    finishAuthRedirect().then(setRecovery).catch(err => { logError("auth_callback_failed", err); setAuthError(err.message); });
    return unsubscribe;
  }, []);
  return <>
    {authError && <div role="alert" className="alert">{authError}</div>}
    <Workspace key={session?.user.id || "local"} session={session}
      recovery={recovery} onRecovered={() => setRecovery(false)} />
  </>;
}

function Workspace({ session, recovery, onRecovered }) {
  const local = useTasks();
  const cloud = useCloudTasks(session?.user.id);
  const { tasks, error, blocked, add, update, move, remove, restore, clearCompleted } = session ? cloud : local;
  const expansion = useTaskExpansion(tasks, session?.user.id || "local");
  const [selectedId, setSelectedId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStatus, setNewStatus] = useState(DEFAULT_TASK_STATUS);
  const [newDueDate, setNewDueDate] = useState("");
  const [parentId, setParentId] = useState(null);
  const [notice, setNotice] = useState("");
  const migrationPreferenceKey = "task-log:hide-local-notice:" + (session?.user.id || "local");
  const [migrationHidden, setMigrationHidden] = useState(() => {
    try { return localStorage.getItem(migrationPreferenceKey) === "true"; }
    catch { return false; }
  });

  function setMigrationVisibility(hidden) {
    setMigrationHidden(hidden);
    try {
      localStorage.setItem(migrationPreferenceKey, String(hidden));
    } catch {
      setNotice("Окно " + (hidden ? "скрыто" : "показано") +
        ", но браузер не смог запомнить этот выбор после перезагрузки.");
    }
  }

  const taskDrafts = useRef(new Map());
  const titleInput = useRef(null);
  const importInput = useRef(null);
  useEffect(() => {
    const warn = event => {
      if (taskDrafts.current.size) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const selected = tasks.find(task => task.id === selectedId);
  const parent = tasks.find(task => task.id === parentId);
  const done = tasks.filter(task => task.done).length;

  function prepareAdd(id = null) {
    setParentId(id);
    expansion.expand(id);
    titleInput.current?.focus();
  }

  async function createTask(event) {
    event.preventDefault();
    if (!newTitle.trim() || blocked) return;

    const id = await add(newTitle, parentId, newStatus, newDueDate);

    if (id) {
      setNewTitle("");
      setNewStatus(DEFAULT_TASK_STATUS);
      setNewDueDate("");
      setSelectedId(id);
    }
  }

  function exportTasks(data = tasks) {
    const blob = new Blob(
      [JSON.stringify({ version: 1, tasks: data }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `task-log-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importTasks(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      if (file.size > 5_000_000) throw new Error("Файл превышает 5 МБ.");
      const data = JSON.parse(await file.text());

      if (!window.confirm(
        "Восстановление заменит текущие задачи. Продолжить?"
      )) return;

      if (await restore(data)) {
        setSelectedId(null);
        setParentId(null);
        setNotice("Резервная копия восстановлена.");
      }
    } catch (err) {
      logError("import_failed", err);
      setNotice(err instanceof SyntaxError
        ? "Не удалось прочитать JSON-файл."
        : err.message);
    }
  }

  return (
    <div className="app">
      <header>
        <div className="brand-account">
        <div className="brand">
          <div className="emblem">T</div>
          <div>
            <strong>TASK<span>LOG</span></strong>
            <div className="eyebrow">Личный журнал задач</div>
          </div>
        </div>
        <AccountMenu session={session} recovery={recovery} onRecovered={onRecovered} busy={cloud.busy} />
        </div>

        <div className="backup-actions">
          {session && local.tasks.length > 0 && migrationHidden && (
            <button type="button" title="Показать сохранённые в этом браузере задачи и возможность их экспорта" onClick={() => setMigrationVisibility(false)}>
              Локальные задачи
            </button>
          )}
          <button title="Скачать резервную копию всех задач, включая выполненные, в JSON-файл" onClick={() => exportTasks()} disabled={blocked}>
            Экспорт
          </button>
          <button title="Загрузить задачи из JSON-файла. После подтверждения текущие задачи будут заменены" disabled={Boolean(session) && blocked} onClick={() => importInput.current?.click()}>
            Восстановить
          </button>
          <input
            ref={importInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={importTasks}
          />
        </div>
      </header>

      {session && <div className="sync-status" role="status">{cloud.status}
        <button title="Проверить изменения в облаке и загрузить актуальные задачи с других устройств" disabled={cloud.busy} onClick={cloud.refresh}>Проверить сейчас</button>
      </div>}
      {session && local.tasks.length > 0 && !migrationHidden && <div className="migration">
        <p>В этом браузере остались прежние локальные задачи: {local.tasks.length}. Их копия сохранена отдельно.</p>
        <button onClick={() => exportTasks(local.tasks)}>Экспорт локальных задач</button>
        <button type="button" onClick={() => setMigrationVisibility(true)}>
          Скрыть данное окно
        </button>
        {cloud.ready && tasks.length === 0 && <button className="primary" disabled={blocked} onClick={async () => {
          if (await restore({ version: 1, tasks: local.tasks })) setNotice("Локальные задачи скопированы в облако.");
        }}>Перенести локальные задачи в облако</button>}
      </div>}
      {error && <div className="alert" role="alert">{error}</div>}
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Закрыть">×</button>
        </div>
      )}

      <main>
        <section className="workspace">
          <div className="section-heading">
            <div>
              <div className="eyebrow orange">Пивоварня BlackIce'a</div>
              <h1>Журнал задач</h1>
            </div>
            <span className="summary">{done} / {tasks.length} выполнено</span>
          </div>

          <div className="overview">
            <div><b>{tasks.filter(task => task.parentId === null).length}</b>
              <span>главных задач</span></div>
            <div><b>{tasks.length - done}</b><span>открытых</span></div>
            <div><b>{done}</b><span>выполнено</span></div>
          </div>

          <TaskComposer parent={parent} setParentId={setParentId} createTask={createTask}
            titleInput={titleInput} newTitle={newTitle} setNewTitle={setNewTitle}
            newStatus={newStatus} setNewStatus={setNewStatus}
            newDueDate={newDueDate} setNewDueDate={setNewDueDate} blocked={blocked} />

          <TaskSections
            onMove={async (id, parentId, expectedParentId) => {
              const ok = await move(id, parentId, expectedParentId);
              if (ok) expansion.expand(parentId);
              return ok;
            }}
            onClearCompleted={async () => {
              if (await clearCompleted()) {
                if (selected?.done) setSelectedId(null);
                if (parent?.done) setParentId(null);
                setNotice("Выполненные задачи удалены.");
              }
            }}
            disabled={blocked}
            tasks={expansion.tasks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={(id, changes) => {
              if (typeof changes.collapsed === "boolean") {
                expansion.set(id, changes.collapsed);
                return true;
              }
              return update(id, changes);
            }}
            onAdd={prepareAdd}
          />

          <footer>
            {session ? cloud.status : error ? "Проверьте сохранение" : "Изменения сохраняются в этом браузере"}
          </footer>
        </section>

        {selected ? (
          <TaskEditor
            key={selected.id}
            drafts={taskDrafts}
            disabled={blocked}
            task={selected}
            tasks={tasks}
            onUpdate={update}
            onAdd={prepareAdd}
            onDelete={async id => {
              if (await remove(id)) {
                setSelectedId(null);
                setParentId(null);
              }
            }}
          />
        ) : (
          <aside className="editor editor-empty">
            <div className="eyebrow">Детали</div>
            <h2>Выберите задачу</h2>
            <p>Нажмите на её название, чтобы открыть заметки и редактирование.</p>
          </aside>
        )}
      </main>
    </div>
  );
}
