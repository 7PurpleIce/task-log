export const MAX_TASK_LINK_LENGTH = 2048;

export function validTaskLink(value) {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value !== "string" || value.length > MAX_TASK_LINK_LENGTH) return false;
  try {
    const url = new URL(value);
    return /^https?:\/\//i.test(value) && ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}

export function taskLinkHref(value) {
  return value && validTaskLink(value) ? value : null;
}
