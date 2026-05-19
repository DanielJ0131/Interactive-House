const AUTH_SESSION_COOKIE = "auth_session";
const GUEST_SESSION_COOKIE = "guest_session";

const isBrowser = () => typeof document !== "undefined";

const hasCookie = (name: string) => {
  if (!isBrowser()) return false;

  return document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${name}=`));
};

export const isGuestSession = () =>
  hasCookie(GUEST_SESSION_COOKIE) && !hasCookie(AUTH_SESSION_COOKIE);

export const setGuestSessionCookie = () => {
  if (!isBrowser()) return;

  document.cookie = `${GUEST_SESSION_COOKIE}=true; path=/; max-age=86400; SameSite=Lax`;
};

export const clearGuestSessionCookie = () => {
  if (!isBrowser()) return;

  document.cookie = `${GUEST_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};
