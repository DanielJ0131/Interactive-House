import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "@/app/auth/login/page";
import { signInWithEmailAndPassword } from "firebase/auth";

const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: jest.fn(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = "";
  });

  test("renders the login page", () => {
    render(<LoginPage />);

    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByText("Sign in to control your house")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  test("shows error when email is empty", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
  });

  test("shows error when password is empty", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("name@example.com"), "test@example.com");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  test("logs in successfully and redirects to hub", async () => {
    const user = userEvent.setup();

    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: {
        email: "test@example.com",
      },
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("name@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "test@example.com",
        "password123"
      );
    });

    expect(replaceMock).toHaveBeenCalledWith("/hub");
  });

  test("shows friendly error when Firebase rejects login", async () => {
    const user = userEvent.setup();

    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: "auth/wrong-password",
    });

    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("name@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Wrong email or password.")).toBeInTheDocument();
  });
});