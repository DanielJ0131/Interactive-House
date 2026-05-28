import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TopHeader from "@/components/TopHeader";
import { useGuestMode } from "@/app/hooks/useGuestMode";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/hub",
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
  }),
}));

jest.mock("@/app/hooks/useGuestMode", () => ({
  useGuestMode: jest.fn(),
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
}));

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
}));

describe("TopHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.documentElement.className = "";
    (useGuestMode as jest.Mock).mockReturnValue(false);
  });

  test("loads saved theme on mount", async () => {
    localStorage.setItem("theme", "theme-protanopia");

    render(<TopHeader />);

    await waitFor(() => {
      expect(document.documentElement.className).toBe("theme-protanopia");
    });
  });

  test("toggles mobile menu and sets theme", async () => {
    const user = userEvent.setup();

    render(<TopHeader />);

    await user.click(screen.getByRole("button", { name: /toggle menu/i }));

    await user.click(screen.getByRole("button", { name: "Tritanopia" }));

    expect(document.documentElement.className).toBe("theme-tritanopia");
    expect(localStorage.getItem("theme")).toBe("theme-tritanopia");
  });

  test("shows guest actions when in guest mode", () => {
    (useGuestMode as jest.Mock).mockReturnValue(true);

    render(<TopHeader />);

    expect(screen.getByText("Guest")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
  });

  test("emergency button routes to emergency page", async () => {
    const user = userEvent.setup();

    render(<TopHeader />);

    await user.click(screen.getByRole("button", { name: /emergency/i }));

    expect(pushMock).toHaveBeenCalledWith("/emergency?from=hub");
  });
});
