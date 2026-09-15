import NicknameEditor from "./NicknameEditor";
import { getNickname } from "../profile";
import React, { useState } from "react";
import { signIn, signUp, signOut, resetPassword, changePassword } from "../cloud";

export default function AccountPanel({ session, recovery, onRecovered, busy }) {
  const [editingNickname, setEditingNickname] = useState(false);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setShowPassword(false);
    setMessage("");
    try {
      if (recovery) {
        await changePassword(password);
        onRecovered();
        setMessage("Пароль изменён.");
      } else if (mode === "signup") {
        const signedIn = await signUp(email.trim(), password);
        if (!signedIn) setMessage("Проверьте почту и подтвердите email по ссылке. Затем войдите.");
      } else if (mode === "reset") {
        await resetPassword(email.trim());
        setMessage("Если аккаунт существует, письмо для восстановления отправлено.");
      } else {
        await signIn(email.trim(), password);
      }
      setPassword("");
    } catch (err) { setMessage(err.message); }
    finally { setPending(false); }
  }
  return (
    <section className="account-panel" aria-label="Аккаунт и синхронизация">
      <div>
        <strong>{session ? (getNickname(session.user) || "Облачный журнал") : "Синхронизация с телефоном"}</strong>
        <p className="hint">{session ? session.user.email :
          "Войдите в один аккаунт на компьютере и телефоне. Без входа задачи хранятся только в этом браузере."}</p>
      </div>
      {session && !recovery ? (
        <>
        <div className="profile-actions">
          <button type="button" disabled={busy || pending} onClick={async () => {
            setPending(true);
            try {
              if (window.confirm("Выйти из аккаунта? Несохранённый текст редактора будет потерян.")) await signOut();
            } catch (err) { setMessage(err.message); }
            finally { setPending(false); }
          }}>Выйти</button>
          <button type="button" disabled={pending}
            aria-expanded={editingNickname}
            title={editingNickname ? "Закрыть редактирование ника" : "Изменить ник"}
            onClick={() => setEditingNickname(value => !value)}>
            {editingNickname ? "Закрыть" : "Изменить ник"}
          </button>
        </div>
        {editingNickname && <NicknameEditor user={session.user} disabled={false} onBusyChange={setPending} />}
        </>
      ) : (
        <form onSubmit={submit} className="account-form">
          {!recovery && <label>Email
            <input type="email" required autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} />
          </label>}
          {(recovery || mode !== "reset") && (
            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
              <label htmlFor="account-password">Пароль</label>
              <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                <input
                  id="account-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "login" && !recovery ? 1 : 8}
                  autoComplete={mode === "login" && !recovery ? "current-password" : "new-password"}
                  autoCapitalize="none"
                  spellCheck={false}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label="Показать пароль"
                  aria-pressed={showPassword}
                  aria-controls="account-password"
                  onClick={() => setShowPassword(value => !value)}
                  style={{ flexShrink: 0, minHeight: 44 }}
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>
          )}
          <button className="primary" disabled={pending}>
            {pending ? "Подождите…" : recovery ? "Сохранить новый пароль" :
              mode === "signup" ? "Зарегистрироваться" : mode === "reset" ? "Восстановить пароль" : "Войти"}
          </button>
          {!recovery && <div className="auth-links">
            <button type="button" disabled={pending} onClick={() => {
              setMode(mode === "signup" ? "login" : "signup"); setMessage(""); setShowPassword(false);
            }}>{mode === "signup" ? "Уже есть аккаунт" : "Создать аккаунт"}</button>
            <button type="button" disabled={pending} onClick={() => {
              setMode(mode === "reset" ? "login" : "reset"); setMessage(""); setShowPassword(false);
            }}>{mode === "reset" ? "Вернуться ко входу" : "Забыли пароль?"}</button>
          </div>}
        </form>
      )}
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
