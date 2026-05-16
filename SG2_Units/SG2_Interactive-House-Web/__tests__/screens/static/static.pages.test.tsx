import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Home from "@/app/page";
import DevicesPage from "@/app/devices/page";
import VoicePage from "@/app/voice/page";
import GuestHubPage from "@/app/guest_hub/page";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
  }),
  usePathname: () => "/hub",
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
}));

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
}));

describe("Static pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Home page renders title and navigation links", () => {
    render(<Home />);

    expect(screen.getByText("INTERACTIVE SMART HOUSE")).toBeInTheDocument();
    expect(screen.getByText(/By Group 4 Software Engineering/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Get Started/i })).toHaveAttribute(
      "href",
      "/auth/login"
    );

    expect(screen.getByRole("link", { name: /Explore as Guest/i })).toHaveAttribute(
      "href",
      "/guest_hub"
    );
  });

  test("Devices page renders smart house component list", () => {
    render(<DevicesPage />);

    expect(screen.getByText("Devices")).toBeInTheDocument();
    expect(screen.getByText("Smart House Components")).toBeInTheDocument();

    expect(screen.getByText("Servo 1 (Door)")).toBeInTheDocument();
    expect(screen.getByText("Servo 2 (Window)")).toBeInTheDocument();
    expect(screen.getByText("MQ-2 Gas Sensor")).toBeInTheDocument();
    expect(screen.getByText("Relay Module")).toBeInTheDocument();
    expect(screen.getByText("White LED")).toBeInTheDocument();
    expect(screen.getByText("LCD1602 Display")).toBeInTheDocument();
    expect(screen.getByText("Photocell Sensor")).toBeInTheDocument();
    expect(screen.getByText("Soil Humidity Sensor")).toBeInTheDocument();
    expect(screen.getByText("PIR Motion Sensor")).toBeInTheDocument();
    expect(screen.getByText("Passive Buzzer")).toBeInTheDocument();
    expect(screen.getByText("Button Sensor 1")).toBeInTheDocument();
  });

  test("Voice page shows that voice control is under development", () => {
    render(<VoicePage />);

    expect(screen.getByText("Voice Assistant")).toBeInTheDocument();
    expect(screen.getByText("Voice Recognition")).toBeInTheDocument();
    expect(screen.getByText("System in Progress")).toBeInTheDocument();
    expect(
      screen.getByText("Voice command integration is currently under development.")
    ).toBeInTheDocument();
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Return to Hub/i })).toHaveAttribute(
      "href",
      "/hub"
    );
  });

  test("Guest hub renders read-only smart house information", () => {
    render(<GuestHubPage />);

    expect(screen.getByText("Guest Hub")).toBeInTheDocument();
    expect(screen.getByText("Read-Only Interface")).toBeInTheDocument();

    expect(screen.getByText("Emergency Call")).toBeInTheDocument();
    expect(screen.getByText("Servo 1 (Door)")).toBeInTheDocument();
    expect(screen.getByText("Servo 2 (Window)")).toBeInTheDocument();
    expect(screen.getByText("Relay Module")).toBeInTheDocument();
    expect(screen.getByText("White LED")).toBeInTheDocument();
    expect(screen.getByText("Yellow LED Module")).toBeInTheDocument();
    expect(screen.getByText("Fan Module")).toBeInTheDocument();
    expect(screen.getByText("Buzzer (Alarm)")).toBeInTheDocument();
    expect(screen.getByText("Motion Sensor")).toBeInTheDocument();
    expect(screen.getByText("Gas Detector")).toBeInTheDocument();

    expect(screen.getAllByText("Guest View").length).toBeGreaterThan(0);
    expect(screen.getByText("• SYSTEM CLEAR")).toBeInTheDocument();
  });

  test("Guest hub emergency button redirects to emergency page", async () => {
    const user = userEvent.setup();

    render(<GuestHubPage />);

    await user.click(screen.getByRole("button", { name: /Emergency Call/i }));

    expect(pushMock).toHaveBeenCalledWith("/emergency?from=guest_hub");
  });
});