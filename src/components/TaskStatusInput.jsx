import React from "react";
import { MAX_TASK_STATUS_LENGTH } from "../taskStatuses";

export default function TaskStatusInput(props) {
  return (
    <input
      type="text"
      className="task-status-input"
      maxLength={MAX_TASK_STATUS_LENGTH}
      placeholder="Этап выполнения"
      {...props}
    />
  );
}
