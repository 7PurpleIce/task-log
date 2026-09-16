import { useRef, useState } from "react";
import { canMoveTask } from "./tasks/model";

export default function useTaskMove(tasks, onMove, disabled) {
  const [moving, setMoving] = useState(null);
  const [over, setOver] = useState(undefined);
  const [message, setMessage] = useState("");
  const source = useRef(null);
  const pending = useRef(false);
  function cancel() { source.current = null; setMoving(null); setOver(undefined); }
  function begin(task) {
    if (disabled || pending.current) return;
    source.current = { id: task.id, parentId: task.parentId };
    setMoving(task.id); setMessage("");
  }
  function allowed(parentId) {
    return !disabled && !pending.current && source.current &&
      canMoveTask(tasks, source.current.id, parentId);
  }
  async function drop(parentId) {
    if (!allowed(parentId)) return;
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
  function targetProps(parentId) {
    return {
      onDragOver: event => {
        if (allowed(parentId)) {
          event.preventDefault(); event.stopPropagation();
          event.dataTransfer.dropEffect = "move"; setOver(parentId);
        }
      },
      onDragLeave: event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOver(undefined);
      },
      onDrop: event => {
        if (!source.current) return;
        event.preventDefault(); event.stopPropagation(); drop(parentId);
      }
    };
  }
  return { moving, over, message, cancel, allowed, drop, targetProps,
    handleProps: task => ({
      draggable: !disabled,
      onDragStart: event => {
        if (disabled || pending.current) { event.preventDefault(); return; }
        begin(task);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-task-log-task", task.id);
      },
      onDragEnd: cancel,
      onClick: () => source.current?.id === task.id ? cancel() : begin(task)
    })
  };
}
