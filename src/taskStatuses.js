export const DEFAULT_TASK_STATUS = "Новая";
export const MAX_TASK_STATUS_LENGTH = 100;

export function normalizeTaskStatus(status) {
  return status.trim() || DEFAULT_TASK_STATUS;
}

export function getTaskStatus(task) {
  return task.status ?? DEFAULT_TASK_STATUS;
}
