import { taskFields, sameFields } from './model.js';

export function initialDraft(task) {
  const values = taskFields(task);
  return { values, baseline: values };
}
export function editDraft(draft, changes) {
  return { ...draft, values: { ...draft.values, ...changes } };
}
export function isDirty(draft) {
  return !sameFields(draft.values, draft.baseline);
}
