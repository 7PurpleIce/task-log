export async function readCloudUpdate(request, owner, current, loaded, isCurrent = () => true) {
  const filter = '&user_id=eq.' + encodeURIComponent(owner);
  const versions = await request(owner, 'task_logs?select=revision' + filter);
  if (!isCurrent()) return null;
  const revision = versions[0]?.revision ?? 0;
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Некорректная версия облачного сохранения.');
  if (loaded && revision <= current.revision) return null;
  const rows = await request(owner, 'task_logs?select=tasks,revision' + filter);
  if (!isCurrent()) return null;
  const next = rows[0] || { tasks: [], revision: 0 };
  return !loaded || next.revision > current.revision ? next : null;
}
