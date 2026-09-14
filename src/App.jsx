import React, { useRef, useState } from "react";
import useTasks from "./useTasks";
import TaskTree from "./components/TaskTree";
import TaskEditor from "./components/TaskEditor";

export default function App() {
  const { tasks, error, blocked, add, update, remove, restore } = useTasks();
  const [selectedId, setSelectedId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [parentId, setParentId] = useState(null);
  const [notice, setNotice] = useState("");
  const titleInput = useRef(null);
  const importInput = useRef(null);

  const selected = tasks.find(task => task.id === selectedId);
  const parent = tasks.find(task => task.id === parentId);
  const done = tasks.filter(task => task.done).length;

  function prepareAdd(id = null) {
    setParentId(id);
    titleInput.current?.focus();
  }

  function createTask(event) {
    event.preventDefault();
    if (!newTitle.trim()) return;

    const id = add(newTitle, parentId);

    if (id) {
      setNewTitle("");
      setSelectedId(id);
    }
  }

  function exportTasks() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, tasks }, null, 2)],
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

      if (restore(data)) {
        setSelectedId(null);
        setParentId(null);
        setNotice("Резервная копия восстановлена.");
      }
    } catch (err) {
      setNotice(err instanceof SyntaxError
        ? "Не удалось прочитать JSON-файл."
        : err.message);
    }
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="emblem">T</div>
          <div>
            <strong>TASK<span>LOG</span></strong>
            <div className="eyebrow">Личный журнал задач</div>
          </div>
        </div>

        <div className="backup-actions">
          <button onClick={exportTasks} disabled={blocked}>
            Экспорт
          </button>
          <button onClick={() => importInput.current?.click()}>
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

          <div className="composer">
            <div className="composer-context">
              <span>
                {parent ? `Подзадача для: ${parent.title}` : "Новая главная задача"}
              </span>
              {parent && (
                <button onClick={() => setParentId(null)}>Отменить</button>
              )}
            </div>

            <form onSubmit={createTask}>
              <input
                ref={titleInput}
                value={newTitle}
                onChange={event => setNewTitle(event.target.value)}
                placeholder="Что нужно сделать?"
                aria-label="Название новой задачи"
                maxLength={300}
                required
                disabled={blocked}
              />
              <button
                type="submit"
                className="primary"
                disabled={blocked || !newTitle.trim()}
              >
                ＋ Добавить
              </button>
            </form>
          </div>

          <TaskTree
            tasks={tasks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={update}
            onAdd={prepareAdd}
          />

          <footer>
            {error ? "Проверьте сохранение" : "Изменения сохраняются в этом браузере"}
          </footer>
        </section>

        {selected ? (
          <TaskEditor
            key={selected.id}
            task={selected}
            tasks={tasks}
            onUpdate={update}
            onAdd={prepareAdd}
            onDelete={id => {
              if (remove(id)) {
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