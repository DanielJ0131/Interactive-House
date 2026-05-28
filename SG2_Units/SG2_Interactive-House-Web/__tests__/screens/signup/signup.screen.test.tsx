import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "@/app/auth/signup/page";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
}));

describe("SignupPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = "";
  });

  test("renders the signup page", () => {
    render(<SignupPage />);

    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByText("Register to manage your devices")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First and Last Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });

  test("shows error when full name is empty", async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Full name is required.")).toBeInTheDocument();
  });

  test("shows error when email is empty", async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First and Last Name"), "Daniel");
    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Email is required.")).toBeInTheDocument();
  });

  test("shows error when password is too short", async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First and Last Name"), "Daniel");
    await user.type(screen.getByPlaceholderText("name@example.com"), "daniel@example.com");

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[0], "123");

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Password must be at least 6 characters.")).toBeInTheDocument();
  });

  test("shows error when passwords do not match", async () => {
    const user = userEvent.setup();

    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First and Last Name"), "Daniel");
    await user.type(screen.getByPlaceholderText("name@example.com"), "daniel@example.com");

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[0], "password123");
    await user.type(passwordInputs[1], "different123");

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
  });

  test("creates account successfully and redirects to hub", async () => {
    const user = userEvent.setup();

    const fakeUser = {
      email: "daniel@example.com",
    };

    const fakeDocRef = {
      id: "daniel@example.com",
    };

    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: fakeUser,
    });

    (updateProfile as jest.Mock).mockResolvedValueOnce(undefined);
    (doc as jest.Mock).mockReturnValueOnce(fakeDocRef);
    (setDoc as jest.Mock).mockResolvedValueOnce(undefined);

    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First and Last Name"), "Daniel Marcarini");
    await user.type(screen.getByPlaceholderText("name@example.com"), "daniel@example.com");

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[0], "password123");
    await user.type(passwordInputs[1], "password123");

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "daniel@example.com",
        "password123"
      );
    });

    expect(updateProfile).toHaveBeenCalledWith(fakeUser, {
      displayName: "Daniel Marcarini",
    });

    expect(doc).toHaveBeenCalledWith({}, "users", "daniel@example.com");

    expect(setDoc).toHaveBeenCalledWith(fakeDocRef, {
      name: "Daniel Marcarini",
      createdAt: expect.any(String),
      role: "user",
    });

    expect(pushMock).toHaveBeenCalledWith("/hub");
  });

  test("shows friendly error when email is already registered", async () => {
    const user = userEvent.setup();

    (createUserWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      code: "auth/email-already-in-use",
    });

    render(<SignupPage />);

    await user.type(screen.getByPlaceholderText("First and Last Name"), "Daniel");
    await user.type(screen.getByPlaceholderText("name@example.com"), "daniel@example.com");

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await user.type(passwordInputs[0], "password123");
    await user.type(passwordInputs[1], "password123");

    await user.click(screen.getByRole("button", { name: "Sign Up" }));

    expect(await screen.findByText("This email is already registered.")).toBeInTheDocument();
  });
});