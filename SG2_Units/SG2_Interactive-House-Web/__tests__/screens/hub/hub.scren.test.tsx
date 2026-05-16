import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HubPage from "@/app/hub/page";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

const pushMock = jest.fn();
const replaceMock = jest.fn();
const mockDeviceRef = { path: "devices/arduino" };

let mockUser: { email?: string } | null = { email: "daniel@example.com" };
let mockDeviceData: any;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => "/hub",
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => mockDeviceRef),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

function getDefaultDeviceData() {
  return {
    white_light: { state: "off" },
    door: { state: "closed" },
    window: { state: "closed" },
    fan_INA: { state: "off" },
    fan_INB: { state: "off" },
    yellow_led: { value: 128 },
    buzzer: { state: "off" },
    telemetry: {
      motion: 1,
      steam: 22,
      gas: 3,
    },
    sync: {
      lastSource: "web",
      lastUpdatedAt: {
        seconds: 1710000000,
      },
    },
  };
}

function getCardButton(title: string) {
  const titleElement = screen.getByText(title);
  const card = titleElement.closest(".rounded-3xl");

  if (!card) {
    throw new Error(`Could not find card for ${title}`);
  }

  return within(card as HTMLElement).getByRole("button");
}

describe("HubPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = { email: "daniel@example.com" };
    mockDeviceData = getDefaultDeviceData();

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    (onSnapshot as jest.Mock).mockImplementation((_ref, callback) => {
      callback({
        data: () => mockDeviceData,
      });

      return jest.fn();
    });
  });

  test("renders hub page with user name, actuators, sensors, and sync data", async () => {
    render(<HubPage />);

    expect(doc).toHaveBeenCalledWith({}, "devices", "arduino");

    expect(await screen.findByRole("heading", { name: "daniel's Hub" })).toBeInTheDocument();
    expect(screen.getByText("Control Center")).toBeInTheDocument();

    expect(screen.getByText("Voice Control")).toBeInTheDocument();
    expect(screen.getByText("Emergency Call")).toBeInTheDocument();

    expect(screen.getByText("White Light")).toBeInTheDocument();
    expect(screen.getByText("Fan")).toBeInTheDocument();
    expect(screen.getByText("Door")).toBeInTheDocument();
    expect(screen.getByText("Window")).toBeInTheDocument();
    expect(screen.getByText("Yellow LED")).toBeInTheDocument();
    expect(screen.getByText("Buzzer")).toBeInTheDocument();

    expect(screen.getByText("Motion")).toBeInTheDocument();
    expect(screen.getByText("Steam")).toBeInTheDocument();
    expect(screen.getByText("Gas")).toBeInTheDocument();

    expect(screen.getByText("web")).toBeInTheDocument();
  });

  test("redirects unauthenticated users to login", async () => {
    mockUser = null;

    render(<HubPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/auth/login");
    });
  });

  test("emergency tile opens emergency page from hub", async () => {
    const user = userEvent.setup();

    render(<HubPage />);

    await user.click(await screen.findByRole("button", { name: /Emergency Call/i }));

    expect(pushMock).toHaveBeenCalledWith("/emergency?from=hub");
  });

  test("clicking white light updates Firestore", async () => {
    const user = userEvent.setup();

    render(<HubPage />);

    await user.click(getCardButton("White Light"));

    expect(updateDoc).toHaveBeenCalledWith(mockDeviceRef, {
      "white_light.state": "on",
    });
  });

  test("clicking door updates Firestore", async () => {
    const user = userEvent.setup();

    render(<HubPage />);

    await user.click(getCardButton("Door"));

    expect(updateDoc).toHaveBeenCalledWith(mockDeviceRef, {
      "door.state": "open",
    });
  });

  test("clicking window updates Firestore", async () => {
    const user = userEvent.setup();

    render(<HubPage />);

    await user.click(getCardButton("Window"));

    expect(updateDoc).toHaveBeenCalledWith(mockDeviceRef, {
      "window.state": "open",
    });
  });

  test("clicking buzzer updates Firestore", async () => {
    const user = userEvent.setup();

    render(<HubPage />);

    await user.click(getCardButton("Buzzer"));

    expect(updateDoc).toHaveBeenCalledWith(mockDeviceRef, {
      "buzzer.state": "on",
    });
  });

  test("changing yellow LED slider updates Firestore", async () => {
    render(<HubPage />);

    const slider = screen.getByRole("slider");

    fireEvent.change(slider, {
      target: {
        value: "200",
      },
    });

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(mockDeviceRef, {
        "yellow_led.value": 200,
      });
    });
  });

  test("clicking fan from off starts forward mode", async () => {
    const user = userEvent.setup();

    render(<HubPage />);

    const fanTitle = screen.getByText("Fan");
    const fanCard = fanTitle.closest(".rounded-3xl");

    if (!fanCard) {
      throw new Error("Could not find fan card");
    }

    await user.click(within(fanCard as HTMLElement).getByRole("button", { name: "OFF" }));

    expect(updateDoc).toHaveBeenCalledWith(mockDeviceRef, {
      "fan_INA.state": "on",
      "fan_INB.state": "off",
    });
  });
});