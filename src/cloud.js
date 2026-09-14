import { logEvent, logError } from "./diagnostics";
// Only a public client key. Database permissions enforce ownership.
const URL = "https://juodnoiwehmlqzhhhukp.supabase.co";
const KEY = "sb_publishable_Ky8E37uvYAXH_xOoIZRLyw_GYB9hE-5";
const SESSION = "task-log:auth:v1";
const EVENT = "task-log-auth";
const REDIRECT = "https://7purpleice.github.io/task-log/";
let refreshing;

export function getSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION) || "null");
    return value?.user?.id && value?.refresh_token ? value : null;
  } catch (error) { logError("session_read_failed", error); return null; }
}

function putSession(value) {
  try {
  if (value) {
    value.expires_at = value.expires_at || Math.floor(Date.now() / 1000) + value.expires_in;
    localStorage.setItem(SESSION, JSON.stringify(value));
  } else {
    localStorage.removeItem(SESSION);
  }
  } catch (error) { logError("session_save_failed", error); throw error; }
  window.dispatchEvent(new Event(EVENT));
}

export function watchSession(callback) {
  const change = () => callback(getSession());
  const storage = event => { if (event.key === SESSION || event.key === null) change(); };
  window.addEventListener(EVENT, change);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, change);
    window.removeEventListener("storage", storage);
  };
}

async function request(path, { method = "GET", body, token } = {}) {
  const started = performance.now();
  const operation = path.startsWith("/auth/v1/token?grant_type=password") ? "login"
    : path.startsWith("/auth/v1/token?grant_type=refresh_token") ? "refresh"
    : path.startsWith("/auth/v1/signup") ? "signup"
    : path.startsWith("/auth/v1/recover") ? "recover"
    : path.startsWith("/auth/v1/logout") ? "logout"
    : path.startsWith("/auth/v1/user") ? "user"
    : path.startsWith("/rest/v1/rpc/save_task_log") ? "save_tasks"
    : path.startsWith("/rest/v1/task_logs") ? "load_tasks" : "other";
  const context = () => ({ operation, method, durationMs: performance.now() - started });
  let response;
  try {
    response = await fetch(URL + path, {
      method,
      headers: {
        apikey: KEY,
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    logError("request_failed", error, context());
    throw new Error("Нет связи с сервером. Проверьте интернет и повторите действие.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = data?.error_code || data?.code;
    const messages = {
      invalid_credentials: "Неверный email или пароль.",
      email_not_confirmed: "Подтвердите email по ссылке из письма.",
      user_already_exists: "Этот email уже зарегистрирован. Используйте вход.",
      over_email_send_rate_limit: "Слишком много писем. Попробуйте позже.",
      email_address_not_authorized: "Отправка письма пока недоступна. Владелец проекта должен настроить почту в Supabase.",
      weak_password: "Используйте более сложный пароль."
    };
    const error = new Error(messages[code] || data?.msg || data?.message ||
      data?.error_description || "Сервер отклонил запрос.");
    error.code = code;
    error.status = response.status;
    logError("request_failed", error, context());
    throw error;
  }
  if (operation !== "load_tasks") logEvent("request_ok", "info", { ...context(), status: response.status });
  return data;
}

export async function signIn(email, password) {
  const value = await request("/auth/v1/token?grant_type=password", {
    method: "POST", body: { email, password }
  });
  putSession(value);
}

export async function signUp(email, password) {
  const value = await request("/auth/v1/signup?redirect_to=" + encodeURIComponent(REDIRECT), {
    method: "POST", body: { email, password }
  });
  if (value?.access_token) putSession(value);
  return Boolean(value?.access_token);
}

export async function resetPassword(email) {
  await request("/auth/v1/recover?redirect_to=" + encodeURIComponent(REDIRECT), {
    method: "POST", body: { email }
  });
}

export async function signOut() {
  const token = getSession()?.access_token;
  putSession(null);
  if (token) {
    try { await request("/auth/v1/logout?scope=local", { method: "POST", token }); }
    catch { /* Local credentials have already been removed. */ }
  }
}

async function accessToken(owner) {
  async function refresh() {
    const session = getSession();
    if (session?.user.id !== owner) throw new Error("Аккаунт изменился. Повторите действие.");
    if (session.expires_at > Date.now() / 1000 + 60) return session.access_token;
    let updated;
    try {
      updated = await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST", body: { refresh_token: session.refresh_token }
      });
    } catch (error) {
      if (error.status === 400 || error.status === 401) {
        throw new Error("Сеанс истёк. Выйдите и войдите снова. Облачные задачи сохранены.");
      }
      throw error;
    }
    if (getSession()?.user.id !== owner) throw new Error("Аккаунт изменился.");
    putSession(updated);
    return updated.access_token;
  }
  if (!refreshing) {
    refreshing = (navigator.locks
      ? navigator.locks.request("task-log-refresh", refresh)
      : refresh()).finally(() => { refreshing = null; });
  }
  const token = await refreshing;
  if (getSession()?.user.id !== owner) throw new Error("Аккаунт изменился.");
  return token;
}

export async function cloudRequest(owner, path, options = {}) {
  const token = await accessToken(owner);
  return request("/rest/v1/" + path, { ...options, token });
}

export async function changePassword(password) {
  const owner = getSession()?.user.id;
  const token = await accessToken(owner);
  await request("/auth/v1/user", { method: "PUT", body: { password }, token });
}

export async function finishAuthRedirect() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const token = hash.get("access_token");
  const refresh = hash.get("refresh_token");
  if (!token || !refresh) {
    if (hash.has("error_description")) {
      const error = hash.get("error_description");
      history.replaceState(null, "", location.pathname + location.search);
      throw new Error(error);
    }
    return false;
  }
  history.replaceState(null, "", location.pathname + location.search);
  const user = await request("/auth/v1/user", { token });
  putSession({
    access_token: token, refresh_token: refresh, user,
    expires_at: Math.floor(Date.now() / 1000) + Number(hash.get("expires_in") || 3600)
  });
  return hash.get("type") === "recovery";
}
