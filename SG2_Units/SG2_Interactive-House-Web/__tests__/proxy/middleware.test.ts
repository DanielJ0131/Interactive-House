// __tests__/proxy.test.ts
import { proxy } from "@/proxy";
import { NextResponse } from "next/server";

type CookieValue = { value: string } | undefined;

type RequestLike = {
  cookies: {
    get: (name: string) => CookieValue;
  };
  nextUrl: {
    pathname: string;
  };
  url: string;
};

jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url: URL) => ({ type: "redirect", url })),
    next: jest.fn(() => ({ type: "next" })),
  },
}));

const makeRequest = (options: {
  pathname: string;
  url?: string;
  session?: string;
  guestSession?: string;
}): RequestLike => ({
  cookies: {
    get: (name: string) => {
      if (name === "auth_session" && options.session) {
        return { value: options.session };
      }

      if (name === "guest_session" && options.guestSession) {
        return { value: options.guestSession };
      }

      return undefined;
    },
  },
  nextUrl: {
    pathname: options.pathname,
  },
  url: options.url ?? "http://localhost:3000" + options.pathname,
});

describe("Proxy (Routing Security)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("redirects unauthenticated users away from hub", () => {
    const request = makeRequest({ pathname: "/hub" });

    const result = proxy(request as any); // Fix: Call proxy()

    const redirectTarget = (NextResponse.redirect as jest.Mock).mock.calls[0][0];

    expect(result).toEqual({ type: "redirect", url: redirectTarget });
    expect(redirectTarget.pathname).toBe("/auth/login");
  });

  test("allows guest sessions into hub", () => {
    const request = makeRequest({ pathname: "/hub", guestSession: "true" });

    const result = proxy(request as any); // Fix: Call proxy()

    expect(result).toEqual({ type: "next" });
    expect(NextResponse.next).toHaveBeenCalled();
  });

  // NEW: Added this to guarantee 100% branch coverage
  test("allows fully authenticated users into hub", () => {
    const request = makeRequest({ pathname: "/hub", session: "true" });

    const result = proxy(request as any); 

    expect(result).toEqual({ type: "next" });
    expect(NextResponse.next).toHaveBeenCalled();
  });

  test("redirects authenticated users away from auth pages", () => {
    const request = makeRequest({ pathname: "/auth/login", session: "true" });

    const result = proxy(request as any); // Fix: Call proxy()

    const redirectTarget = (NextResponse.redirect as jest.Mock).mock.calls[0][0];

    expect(result).toEqual({ type: "redirect", url: redirectTarget });
    expect(redirectTarget.pathname).toBe("/hub");
  });

  test("allows unauthenticated users on auth pages", () => {
    const request = makeRequest({ pathname: "/auth/login" });

    const result = proxy(request as any); // Fix: Call proxy()

    expect(result).toEqual({ type: "next" });
    expect(NextResponse.next).toHaveBeenCalled();
  });
});