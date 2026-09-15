export const TASK_STATUSES = [
  "Новая",
  "Отменена",
  "HOLD",
  "Подключение на SLT",
  "Тестирование",
  "Подключение на PROD",
  "Боевые испытания",
  "Подключен"
];

export const DEFAULT_TASK_STATUS = TASK_STATUSES[0];

// Older tasks and backups have no workflow status.
export function getTaskStatus(task) {
  return task.status ?? DEFAULT_TASK_STATUS;
}
