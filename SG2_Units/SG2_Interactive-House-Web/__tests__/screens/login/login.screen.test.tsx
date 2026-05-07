/**
 * @jest-environment jsdom
 */

import React from "react";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const replaceMock = jest.fn();
const signInWithEmailAndPasswordMock = jest.fn();

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: { __mockAuth: true },
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPasswordMock(...args),
}));

const loadLoginPage = async () => {
  const module = await import("@/app/auth/login/page");
  return module.default;
};

describe("Login screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows inline validation error when email is missing", async () => {
    const LoginPage = await loadLoginPage();
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
    expect(signInWithEmailAndPasswordMock).not.toHaveBeenCalled();
  });

  it("signs in and routes to hub on success", async () => {
    signInWithEmailAndPasswordMock.mockResolvedValue({ user: { email: "jane@example.com" } });

    const LoginPage = await loadLoginPage();
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: " jane@example.com " } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(signInWithEmailAndPasswordMock).toHaveBeenCalledTimes(1));

    expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(
      expect.any(Object),
      "jane@example.com",
      "secret123"
    );
    expect(replaceMock).toHaveBeenCalledWith("/hub");
    expect(document.cookie).toContain("auth_session=true");
  });

  it("maps firebase error code to a friendly login message", async () => {
    signInWithEmailAndPasswordMock.mockRejectedValue({ code: "auth/wrong-password" });

    const LoginPage = await loadLoginPage();
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(screen.getByText("Wrong email or password.")).toBeInTheDocument());
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
