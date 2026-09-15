import React, { useEffect, useState } from "react";
import { changeNickname } from "../cloud";
import { getNickname, MAX_NICKNAME_LENGTH } from "../profile";

export default function NicknameEditor({ user, disabled, onBusyChange }) {
  const currentName = getNickname(user);
  const [name, setName] = useState(currentName);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!dirty) setName(currentName);
  }, [currentName, dirty]);

  async function save(event) {
    event.preventDefault();
    if (pending || disabled) return;
    setPending(true);
    onBusyChange(true);
    setMessage("");
    try {
      const savedUser = await changeNickname(name);
      setName(getNickname(savedUser));
      setDirty(false);
      setMessage("Ник сохранён.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
      onBusyChange(false);
    }
  }

  return <form className="account-form" onSubmit={save} style={{ marginBottom: 18 }}>
    <label htmlFor="profile-nickname">Ник
      <input id="profile-nickname" autoComplete="nickname"
        value={name} required maxLength={MAX_NICKNAME_LENGTH}
        disabled={pending || disabled} placeholder="Как вас называть?"
        onChange={event => {
          setName(event.target.value);
          setDirty(true);
          setMessage("");
        }} />
    </label>
    <button className="primary" disabled={pending || disabled || !name.trim() || name.trim() === currentName}>
      {pending ? "Сохранение…" : "Сохранить ник"}
    </button>
    {message && <p className="auth-message" role="status">{message}</p>}
  </form>;
}
