/**
 * @jest-environment jsdom
 */

import React from "react";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const pushMock = jest.fn();
const createUserWithEmailAndPasswordMock = jest.fn();
const updateProfileMock = jest.fn();
const docMock = jest.fn();
const setDocMock = jest.fn();

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
    push: pushMock,
  }),
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: { __mockAuth: true },
  db: { __mockDb: true },
}));

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserWithEmailAndPasswordMock(...args),
  updateProfile: (...args: unknown[]) => updateProfileMock(...args),
}));

jest.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
}));

const loadSignupPage = async () => {
  const module = await import("@/app/auth/signup/page");
  return module.default;
};

describe("Signup screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation error when passwords do not match", async () => {
    const SignupPage = await loadSignupPage();
    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText("First and Last Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], { target: { value: "secret1" } });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], { target: { value: "secret2" } });

    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(createUserWithEmailAndPasswordMock).not.toHaveBeenCalled();
  });

  it("creates account, stores user document, and navigates to hub on success", async () => {
    const fakeUser = { email: "jane@example.com" };

    createUserWithEmailAndPasswordMock.mockResolvedValue({ user: fakeUser });
    updateProfileMock.mockResolvedValue(undefined);
    docMock.mockReturnValue({ __docRef: true });
    setDocMock.mockResolvedValue(undefined);

    const SignupPage = await loadSignupPage();
    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText("First and Last Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], { target: { value: "secret123" } });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], { target: { value: "secret123" } });

    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledTimes(1));

    expect(updateProfileMock).toHaveBeenCalledWith(fakeUser, { displayName: "Jane Doe" });
    expect(docMock).toHaveBeenCalledWith(expect.any(Object), "users", "jane@example.com");
    expect(setDocMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        name: "Jane Doe",
        role: "user",
      })
    );
    expect(pushMock).toHaveBeenCalledWith("/hub");
    expect(document.cookie).toContain("auth_session=true");
  });

  it("maps firebase auth error code to friendly message", async () => {
    createUserWithEmailAndPasswordMock.mockRejectedValue({ code: "auth/email-already-in-use" });

    const SignupPage = await loadSignupPage();
    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText("First and Last Name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[0], { target: { value: "secret123" } });
    fireEvent.change(screen.getAllByPlaceholderText("••••••••")[1], { target: { value: "secret123" } });

    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => expect(screen.getByText("This email is already registered.")).toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
