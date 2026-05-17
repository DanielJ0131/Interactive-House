import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeviceCard from "@/components/DeviceCard";
import ToggleRow from "@/components/ToggleRow";
import BottomTabs from "@/components/BottomTabs";
import TopHeader from "@/components/TopHeader";
import AppShell from "@/components/AppShell";
import { PageShell } from "@/components/pageShell";

jest.mock("next/navigation", () => ({
  usePathname: () => "/hub",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
}));

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
}));

describe("Components", () => {
  test("DeviceCard renders name, pin, and icon", () => {
    render(
      <DeviceCard
        name="White LED"
        pin="D13"
        icon={<span data-testid="device-icon">icon</span>}
      />
    );

    expect(screen.getByText("White LED")).toBeInTheDocument();
    expect(screen.getByText("Pin: D13")).toBeInTheDocument();
    expect(screen.getByTestId("device-icon")).toBeInTheDocument();
  });

  test("ToggleRow renders label and sub text", () => {
    render(
      <ToggleRow
        label="Door"
        sub="Pin D9"
        icon={<span>icon</span>}
        value={false}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByText("Door")).toBeInTheDocument();
    expect(screen.getByText("Pin D9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "toggle Door" })).toBeInTheDocument();
  });

  test("ToggleRow calls onChange with the opposite value", async () => {
    const user = userEvent.setup();
    const onChangeMock = jest.fn();

    render(
      <ToggleRow
        label="Light"
        icon={<span>icon</span>}
        value={false}
        onChange={onChangeMock}
      />
    );

    await user.click(screen.getByRole("button", { name: "toggle Light" }));

    expect(onChangeMock).toHaveBeenCalledWith(true);
  });

  test("BottomTabs renders navigation links", () => {
    render(<BottomTabs />);

    expect(screen.getByRole("link", { name: /Hub/i })).toHaveAttribute("href", "/hub");
    expect(screen.getByRole("link", { name: /AI/i })).toHaveAttribute("href", "/ai");
    expect(screen.getByRole("link", { name: /Music/i })).toHaveAttribute("href", "/music");
  });

  test("TopHeader renders title and main navigation", () => {
    render(<TopHeader />);

    expect(screen.getByText("Interactive House")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hub/i })).toHaveAttribute("href", "/hub");
    expect(screen.getByRole("link", { name: /AI/i })).toHaveAttribute("href", "/ai");
    expect(screen.getByRole("link", { name: /Music/i })).toHaveAttribute("href", "/music");
    expect(screen.getByRole("button", { name: /Logout/i })).toBeInTheDocument();
  });

  test("AppShell renders title, subtitle, children, and tabs", () => {
    render(
      <AppShell title="Test Title" subtitle="Test Subtitle">
        <p>Child content</p>
      </AppShell>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hub/i })).toBeInTheDocument();
  });

  test("AppShell can hide bottom tabs", () => {
    render(
      <AppShell title="No Tabs" showTabs={false}>
        <p>Content without tabs</p>
      </AppShell>
    );

    expect(screen.getByText("No Tabs")).toBeInTheDocument();
    expect(screen.getByText("Content without tabs")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Hub/i })).not.toBeInTheDocument();
  });

  test("PageShell renders title, subtitle, right actions, and children", () => {
    render(
      <PageShell
        title="Page Title"
        subtitle="Page Subtitle"
        rightActions={<button>Action</button>}
      >
        <p>Page content</p>
      </PageShell>
    );

    expect(screen.getByText("Page Title")).toBeInTheDocument();
    expect(screen.getByText("Page Subtitle")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });
});