import React, { useEffect, useId, useRef, useState } from "react";
import AccountPanel from "./AccountPanel";

export default function AccountMenu(props) {
  const [open, setOpen] = useState(Boolean(props.recovery));
  const root = useRef(null);
  const trigger = useRef(null);
  const panel = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (props.recovery) setOpen(true);
  }, [props.recovery]);

  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);

  return <div ref={root} className="account-menu" onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="account-trigger"
      aria-label={props.session ? "Мой аккаунт" : "Войти в аккаунт"}
      title={props.session ? "Мой аккаунт" : "Войти в аккаунт"}
      aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen(value => !value)}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </svg>
    </button>
    <div id={panelId} ref={panel} className="account-dropdown"
      role="region" aria-label="Информация об аккаунте" tabIndex={-1} hidden={!open}>
      <button type="button" className="account-close" aria-label="Закрыть окно аккаунта"
        onClick={() => { setOpen(false); trigger.current?.focus(); }}>×</button>
      <AccountPanel {...props} />
    </div>
  </div>;
}
