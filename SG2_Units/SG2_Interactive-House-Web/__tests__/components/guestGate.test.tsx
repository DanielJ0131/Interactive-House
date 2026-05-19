import { render, screen } from "@testing-library/react";
import GuestGate from "@/components/GuestGate";

describe("GuestGate", () => {
  test("renders title, message, and links", () => {
    render(
      <GuestGate
        title="Sign in required"
        message="Please sign in to continue."
      />
    );

    expect(
      screen.getByRole("heading", { name: "Sign in required" })
    ).toBeInTheDocument();
    expect(screen.getByText("Please sign in to continue.")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Log In/i })).toHaveAttribute(
      "href",
      "/auth/login"
    );
    expect(screen.getByRole("link", { name: /Sign Up/i })).toHaveAttribute(
      "href",
      "/auth/signup"
    );
    expect(screen.getByRole("link", { name: /Back to Hub/i })).toHaveAttribute(
      "href",
      "/hub"
    );
  });
});
