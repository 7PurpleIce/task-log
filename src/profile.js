export const MAX_NICKNAME_LENGTH = 40;

export function getNickname(user) {
  const metadata = user?.user_metadata;
  const name = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  return typeof name === "string" ? name.trim() : "";
}

export function validateNickname(value) {
  const name = value.trim();
  if (!name || name.length > MAX_NICKNAME_LENGTH || /[\x00-\x1f\x7f]/.test(name)) {
    throw new Error("Ник должен содержать от 1 до 40 символов без переносов строк.");
  }
  return name;
}
