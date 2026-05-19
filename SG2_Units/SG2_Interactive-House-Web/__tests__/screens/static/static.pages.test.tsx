import { render, screen } from "@testing-library/react";

import Home from "@/app/page";
import DevicesPage from "@/app/devices/page";
import VoicePage from "@/app/voice/page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
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

    expect(screen.getByRole("button", { name: /Explore as Guest/i })).toBeInTheDocument();

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

});