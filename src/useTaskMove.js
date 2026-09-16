import { useEffect, useRef, useState } from "react";
import { branchIds, canMoveTask } from "./tasks/model";

export default function useTaskMove(tasks, onMove, disabled) {
  const [moving, setMoving] = useState(null);
  const [over, setOver] = useState(undefined);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const source = useRef(null);
  const gesture = useRef(null);
  const pending = useRef(false);
  const suppressClickUntil = useRef(0);
  const live = useRef(null);
  function cancel() {
    gesture.current = null; source.current = null;
    setMoving(null); setOver(undefined); setPreview(null);
  }
  function begin(task) {
    if (disabled || pending.current) return;
    source.current = { id: task.id, parentId: task.parentId, title: task.title };
    setMoving(task.id); setMessage("");
  }
  function allowed(parentId) {
    return Boolean(!disabled && !pending.current && source.current &&
      canMoveTask(tasks, source.current.id, parentId));
  }
  async function drop(parentId) {
    if (!allowed(parentId)) { cancel(); return; }
    const selected = source.current;
    pending.current = true;
    cancel();
    try {
      const ok = await onMove(selected.id, parentId, selected.parentId);
      setMessage(ok ? "Задача перенесена вместе со всеми подзадачами." : "Перенос не сохранён. Проверьте сообщение об ошибке и повторите.");
    } catch {
      setMessage("Не удалось переместить задачу. Повторите действие.");
    } finally { pending.current = false; }
  }
  function targetAt(x, y) {
    const element = document.elementFromPoint(x, y)?.closest("[data-task-drop]");
    if (!element) return undefined;
    const id = element.getAttribute("data-task-drop");
    const parentId = id === "" ? null : id;
    return allowed(parentId) ? parentId : undefined;
  }
  live.current = { begin, cancel, drop, targetAt, tasks, disabled };

  useEffect(() => {
    function move(event) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (live.current.disabled) { live.current.cancel(); return; }
      if (!current.started && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return;
      event.preventDefault();
      if (!current.started) {
        current.started = true;
        live.current.begin(current.task);
      }
      setPreview({ x: event.clientX, y: event.clientY, title: current.task.title,
        count: branchIds(live.current.tasks, current.task.id).size });
      setOver(live.current.targetAt(event.clientX, event.clientY));
      if (event.clientY < 48) window.scrollBy(0, -16);
      else if (event.clientY > window.innerHeight - 48) window.scrollBy(0, 16);
    }
    function end(event) {
      const current = gesture.current;
      if (!current || current.pointerId !== event.pointerId) return;
      gesture.current = null;
      if (!current.started) return;
      suppressClickUntil.current = Date.now() + 500;
      const target = live.current.targetAt(event.clientX, event.clientY);
      if (target === undefined) live.current.cancel();
      else live.current.drop(target);
    }
    const cancelGesture = () => live.current.cancel();
    const escape = event => { if (event.key === "Escape") live.current.cancel(); };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", cancelGesture);
    window.addEventListener("blur", cancelGesture);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", cancelGesture);
      window.removeEventListener("blur", cancelGesture);
      window.removeEventListener("keydown", escape);
    };
  }, []);

  function pointerProps(task) {
    return {
      draggable: false,
      onDragStart: event => event.preventDefault(),
      onPointerDown: event => {
        if (event.button !== 0 || !event.isPrimary || disabled || pending.current) return;
        gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, task, started: false };
      },
      onClickCapture: event => {
        if (Date.now() < suppressClickUntil.current) {
          event.preventDefault(); event.stopPropagation();
        }
      }
    };
  }
  return { moving, over, preview, message, cancel, allowed, drop,
    pointerProps,
    targetProps: parentId => ({ "data-task-drop": parentId ?? "" }),
    handleProps: task => ({
      ...pointerProps(task),
      onClick: () => source.current?.id === task.id ? cancel() : begin(task)
    })
  };
}
