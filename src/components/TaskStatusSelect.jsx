import React from "react";
import { TASK_STATUSES } from "../taskStatuses";

export default function TaskStatusSelect(props) {
  return (
    <select className="task-status-select" {...props}>
      {TASK_STATUSES.map(status => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );
}
