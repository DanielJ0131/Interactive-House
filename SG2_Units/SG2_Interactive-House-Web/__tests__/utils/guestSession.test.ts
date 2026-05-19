import {
  clearAuthSessionCookie,
  clearGuestSessionCookie,
  isGuestSession,
  setGuestSessionCookie,
  startGuestSession,
} from "@/utils/guestSession";

const clearCookies = () => {
  document.cookie =
    "auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie =
    "guest_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
};

describe("guestSession", () => {
  beforeEach(() => {
    clearCookies();
  });

  afterEach(() => {
    clearCookies();
  });

  test("isGuestSession returns false by default", () => {
    expect(isGuestSession()).toBe(false);
  });

  test("isGuestSession requires guest cookie and no auth cookie", () => {
    document.cookie = "guest_session=true; path=/";

    expect(isGuestSession()).toBe(true);

    document.cookie = "auth_session=true; path=/";

    expect(isGuestSession()).toBe(false);
  });

  test("setGuestSessionCookie and clearGuestSessionCookie", () => {
    setGuestSessionCookie();

    expect(document.cookie).toContain("guest_session=true");

    clearGuestSessionCookie();

    expect(document.cookie).not.toContain("guest_session=true");
  });

  test("startGuestSession clears auth and sets guest", () => {
    document.cookie = "auth_session=true; path=/";

    startGuestSession();

    expect(document.cookie).toContain("guest_session=true");
    expect(document.cookie).not.toContain("auth_session=true");
  });

  test("clearAuthSessionCookie removes auth cookie", () => {
    document.cookie = "auth_session=true; path=/";

    clearAuthSessionCookie();

    expect(document.cookie).not.toContain("auth_session=true");
  });
});
