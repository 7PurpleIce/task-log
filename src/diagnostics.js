const KEY = "task-log:diagnostics:v1";
const LIMIT = 300;
export const BUILD = "2026-09-14-diagnostics-1";
export const EVENTS = {
  app_start: "Запуск приложения", runtime_error: "Ошибка JavaScript",
  promise_error: "Необработанная ошибка операции", render_error: "Ошибка интерфейса",
  offline: "Соединение потеряно", online: "Соединение восстановлено",
  request_failed: "Ошибка запроса", request_ok: "Запрос выполнен",
  local_read_failed: "Не удалось прочитать локальные задачи",
  local_save_failed: "Не удалось сохранить локальные задачи",
  local_saved: "Локальные задачи сохранены", session_read_failed: "Не удалось прочитать сеанс",
  session_save_failed: "Не удалось сохранить сеанс",
  sync_failed: "Ошибка загрузки облачных задач", save_failed: "Ошибка сохранения в облаке",
  cloud_saved: "Изменения сохранены в облаке", conflict: "Конфликт изменений",
  import_failed: "Ошибка импорта", auth_callback_failed: "Ошибка подтверждения входа"
};
const operations = new Set(["login", "signup", "refresh", "logout", "recover", "user", "load_tasks", "save_tasks", "other"]);
const codes = new Set(["40001", "42501", "22023", "PGRST301", "PGRST116", "invalid_credentials",
 "email_not_confirmed", "user_already_exists", "over_email_send_rate_limit",
 "email_address_not_authorized", "weak_password", "refresh_token_not_found",
 "refresh_token_already_used", "unexpected_failure", "email_exists", "request_timeout"]);
const names = new Set(["Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError",
 "SecurityError", "QuotaExceededError", "AbortError", "TimeoutError", "NetworkError"]);
let entries = [];
let persistent = true;

// Strict allowlist: never serialize arbitrary messages, URLs, bodies or credentials.
function metadata(input = {}) {
  const out = {};
  if (operations.has(input.operation)) out.operation = input.operation;
  if (["GET", "POST", "PUT", "PATCH", "DELETE"].includes(input.method)) out.method = input.method;
  if (codes.has(input.code)) out.code = input.code;
  if (names.has(input.name)) out.name = input.name;
  for (const key of ["status", "durationMs", "revision", "line", "column"]) {
    if (Number.isFinite(input[key]) && input[key] >= 0) out[key] = Math.floor(input[key]);
  }
  if (typeof input.frames === "string" || Array.isArray(input.frames)) {
    out.frames = ((Array.isArray(input.frames) ? input.frames.filter(v => typeof v === "string").join(" ") : input.frames).match(/\/assets\/index-[A-Za-z0-9_-]{1,80}\.js:\d{1,8}:\d{1,8}/g) || []).slice(0, 6);
  }
  return out;
}

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.slice(-LIMIT).filter(e => Object.hasOwn(EVENTS, e.event) &&
      typeof e.time === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(e.time))
      .map(e => ({ time: e.time, event: e.event,
        level: ["info", "warn", "error"].includes(e.level) ? e.level : "error",
        build: /^\d{4}-\d{2}-\d{2}-diagnostics-\d+$/.test(e.build) ? e.build : "unknown",
        online: e.online === true, meta: metadata(e.meta) }));
  } catch { persistent = false; return entries; }
}
entries = read();

export function logEvent(event, level = "info", meta = {}) {
  try {
    if (!Object.hasOwn(EVENTS, event)) return;
    const entry = {
      time: new Date().toISOString(), build: BUILD, event,
      level: ["info", "warn", "error"].includes(level) ? level : "error",
      online: navigator.onLine, meta: metadata(meta)
    };
    entries = [...(persistent ? read() : entries), entry].slice(-LIMIT);
    try { localStorage.setItem(KEY, JSON.stringify(entries)); persistent = true; }
    catch { persistent = false; }
    window.dispatchEvent(new Event("task-log-diagnostics"));
  } catch { /* Diagnostics must never break the application. */ }
}

export function logError(event, error, extra = {}) {
  logEvent(event, "error", {
    ...extra, name: error?.name, code: error?.code, status: error?.status,
    frames: typeof error?.stack === "string" ? error.stack : ""
  });
}

export function getDiagnostics() {
  if (persistent) entries = read();
  return { version: 1, build: BUILD, persistent, entries: entries.slice() };
}

export function clearDiagnostics() {
  entries = [];
  try { localStorage.removeItem(KEY); persistent = true; }
  catch { persistent = false; }
  window.dispatchEvent(new Event("task-log-diagnostics"));
}

export function downloadDiagnostics() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(getDiagnostics(), null, 2)],
    { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "task-log-diagnostics-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let installed = false;
export function installDiagnostics() {
  if (installed) return;
  installed = true;
  window.addEventListener("error", e => logError("runtime_error", e.error, { line: e.lineno, column: e.colno }));
  window.addEventListener("unhandledrejection", e => logError("promise_error", e.reason));
  window.addEventListener("offline", () => logEvent("offline", "warn"));
  window.addEventListener("online", () => logEvent("online"));
  logEvent("app_start");
}
