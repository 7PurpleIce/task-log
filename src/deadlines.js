export function validDueDate(value) {
  if (value == null || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00");
  return Number(value.slice(0, 4)) >= 1000 && Number(value.slice(0, 4)) <= 9999 &&
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10));
}
const dayNumber = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;

export function deadlineInfo(task, now = new Date()) {
  if (!task.dueDate || !validDueDate(task.dueDate)) return null;
  const date = new Date(task.dueDate + "T12:00:00");
  const days = dayNumber(date) - dayNumber(now);
  const overdue = !task.done && days < 0;
  let remaining = "";
  if (!task.done) {
    if (days === 0) remaining = "сегодня";
    else if (days === 1) remaining = "завтра";
    else if (days < 0) remaining = "просрочено на " + Math.abs(days) + " дн.";
    else {
      let months = (date.getFullYear() - now.getFullYear()) * 12 + date.getMonth() - now.getMonth();
      const anchorFor = count => {
        const anchor = new Date(now.getFullYear(), now.getMonth() + count, 1, 12);
        const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
        anchor.setDate(Math.min(now.getDate(), lastDay));
        return anchor;
      };
      if (dayNumber(anchorFor(months)) > dayNumber(date)) months--;
      const rest = dayNumber(date) - dayNumber(anchorFor(months));
      remaining = months > 0 ? months + " мес." + (rest ? " " + rest + " дн." : "") : days + " дн.";
    }
  }
  return { overdue, label: date.toLocaleDateString("ru-RU") + (remaining ? " (" + remaining + ")" : "") };
}

export function compareDeadlines(a, b, order) {
  if (order === "default") return 0;
  if (!a.dueDate || !b.dueDate) return Number(!a.dueDate) - Number(!b.dueDate);
  return a.dueDate.localeCompare(b.dueDate) * (order === "desc" ? -1 : 1);
}
