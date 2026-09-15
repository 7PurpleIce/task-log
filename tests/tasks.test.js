import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask, updateTask, removeTask, validate, tasksByStatus, taskFields } from '../src/tasks/model.js';
import { readLocalTasks, writeLocalTasks } from '../src/tasks/localRepository.js';
import { readCloudUpdate } from '../src/tasks/cloudRepository.js';
import { initialDraft, editDraft, isDirty } from '../src/tasks/drafts.js';
import { deadlineInfo } from '../src/deadlines.js';
const task = (id, parentId = null) => ({ id, parentId, title: id, notes: '', done: false, collapsed: false, createdAt: '2026-09-15' });
function storage(tasks) {
  let raw = JSON.stringify({ version: 1, tasks });
  return { getItem: () => raw, setItem: (key, value) => { raw = value; } };
}
function locks() {
  let queue = Promise.resolve();
  return { request: (key, callback) => { const result = queue.then(callback); queue = result.catch(() => {}); return result; } };
}

test('two concurrent tabs preserve independent edits using the newest document', async () => {
  const store = storage([task('a')]); const lock = locks();
  await Promise.all([
    writeLocalTasks(store, lock, tasks => createTask(tasks, { title: 'b' }, 'b', '2026-09-15')),
    writeLocalTasks(store, lock, tasks => updateTask(tasks, 'a', { notes: 'second tab' }))
  ]);
  const saved = readLocalTasks(store);
  assert.equal(saved.tasks.length, 2);
  assert.equal(saved.tasks.find(t => t.id === 'a').notes, 'second tab');
  assert.equal(saved.revision, 2);
});

test('stale editor cannot overwrite a newer edit; original data stays intact', async () => {
  const original = task('a'); const store = storage([original]); const lock = locks();
  await writeLocalTasks(store, lock, tasks => updateTask(tasks, 'a', { title: 'new' }));
  await assert.rejects(writeLocalTasks(store, lock, tasks => updateTask(tasks, 'a', { title: 'old draft' }, taskFields(original))), /изменена/);
  assert.equal(readLocalTasks(store).tasks[0].title, 'new');
});

test('deleted parent and invalid date cannot poison local saving', async () => {
  const store = storage([task('a')]); const lock = locks();
  await assert.rejects(writeLocalTasks(store, lock, tasks => createTask(tasks, { title: 'b', parentId: 'missing' }, 'b', '2026-09-15')), /Родительская/);
  await assert.rejects(writeLocalTasks(store, lock, tasks => updateTask(tasks, 'a', { dueDate: '2026-02-30' })), /некорректные/);
  assert.deepEqual(readLocalTasks(store).tasks, [task('a')]);
});

test('failed writes and missing locking support do not claim success', async () => {
  const store = storage([task('a')]);
  await assert.rejects(writeLocalTasks(store, null, tasks => tasks), /Браузер/);
  await assert.rejects(writeLocalTasks({ ...store, setItem: () => { throw new Error('quota'); } }, locks(), tasks => []), /quota/);
  assert.equal(readLocalTasks(store).tasks.length, 1);
});

test('completion unpins descendants; cleanup preserves unfinished descendants', () => {
  const tasks = [task('a'), { ...task('b', 'a'), pinned: true }, task('c', 'b')];
  const done = updateTask(tasks, 'a', { done: true });
  assert.ok(done.every(t => t.done && !t.pinned));
  assert.deepEqual(tasksByStatus(updateTask(done, 'c', { done: false }), false).map(t => [t.id, t.parentId]), [['c', null]]);
  assert.equal(removeTask(tasks, 'a').length, 0);
});

test('drafts retain values and original baseline when switching tasks', () => {
  const cache = new Map(); const a = task('a'); const b = task('b');
  cache.set(a.id, editDraft(initialDraft(a), { notes: 'unsaved text' }));
  assert.equal(initialDraft(b).values.notes, '');
  const resumed = cache.get(a.id);
  assert.equal(resumed.values.notes, 'unsaved text');
  assert.equal(resumed.baseline.notes, '');
  assert.ok(isDirty(resumed));
  assert.ok(!isDirty(editDraft(resumed, { notes: '' })));
});

test('unchanged cloud revision only fetches revision', async () => {
  const calls = [];
  const next = await readCloudUpdate(async (owner, path) => { calls.push(path); return [{ revision: 4 }]; }, 'owner', { revision: 4 }, true);
  assert.equal(next, null); assert.equal(calls.length, 1);
  assert.ok(calls[0].startsWith('task_logs?select=revision&'));
});

test('changed cloud revision loads document; obsolete requests are ignored', async () => {
  const expected = { tasks: [task('a')], revision: 5 }; let calls = 0;
  const request = async () => ++calls === 1 ? [{ revision: 5 }] : [expected];
  assert.deepEqual(await readCloudUpdate(request, 'owner', { revision: 4 }, true), expected);
  calls = 0;
  assert.equal(await readCloudUpdate(request, 'owner', { revision: 4 }, true, () => false), null);
  assert.equal(calls, 1);
});

test('empty initial cloud document loads; legacy backups remain accepted', async () => {
  assert.deepEqual(await readCloudUpdate(async () => [], 'owner', { revision: 0 }, false), { tasks: [], revision: 0 });
  assert.equal(validate({ version: 1, tasks: [task('old')] }).length, 1);
});

test('deadline is overdue only after its day ends, and never for completed tasks', () => {
  const t = { ...task('a'), dueDate: '2026-09-15' };
  assert.equal(deadlineInfo(t, new Date(2026, 8, 15, 23, 59)).overdue, false);
  assert.equal(deadlineInfo(t, new Date(2026, 8, 16)).overdue, true);
  assert.equal(deadlineInfo({ ...t, done: true }, new Date(2026, 8, 16)).overdue, false);
});
