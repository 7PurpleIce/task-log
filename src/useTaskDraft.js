import { useEffect, useState } from 'react';
import { initialDraft, editDraft, isDirty } from './tasks/drafts';

export default function useTaskDraft(task, drafts) {
  const [draft, setDraft] = useState(() => drafts.current.get(task.id) || initialDraft(task));
  const dirty = isDirty(draft);
  useEffect(() => {
    if (!dirty) {
      setDraft(initialDraft(task));
      drafts.current.delete(task.id);
    }
  }, [task.id, task.title, task.notes, task.status, task.dueDate, dirty, drafts]);

  function change(changes) {
    const next = editDraft(draft, changes);
    if (isDirty(next)) drafts.current.set(task.id, next);
    else drafts.current.delete(task.id);
    setDraft(next);
  }
  function reset(values) {
    drafts.current.delete(task.id);
    setDraft({ values, baseline: values });
  }
  return { ...draft, dirty, change, reset };
}
