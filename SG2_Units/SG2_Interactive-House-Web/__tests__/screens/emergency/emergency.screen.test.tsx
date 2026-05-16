import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmergencyPage from "@/app/emergency/page";

const mockPush = jest.fn();
let mockFromValue: string | null = null;
const closeMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "from") {
        return mockFromValue;
      }

      return null;
    },
  }),
}));

describe("EmergencyPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFromValue = null;

    const mockAudioContext = {
      state: "running",
      currentTime: 0,
      destination: {},
      resume: jest.fn(() => Promise.resolve()),
      close: closeMock,
      createOscillator: jest.fn(() => ({
        type: "sine",
        frequency: {
          setValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      })),
      createGain: jest.fn(() => ({
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn(),
        },
        connect: jest.fn(),
      })),
    };

    closeMock.mockClear();

    (window as any).AudioContext = jest.fn(() => mockAudioContext);
    (window as any).webkitAudioContext = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("renders the emergency confirmation screen", () => {
    render(<EmergencyPage />);

    expect(screen.getByText("Emergency Confirmation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Emergency Call" })).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to place an emergency call?")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Emergency Call" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  test("cancel button returns to hub by default", async () => {
    const user = userEvent.setup();

    render(<EmergencyPage />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockPush).toHaveBeenCalledWith("/hub");
  });

  test("cancel button returns to guest hub when opened from guest hub", async () => {
    const user = userEvent.setup();
    mockFromValue = "guest_hub";

    render(<EmergencyPage />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockPush).toHaveBeenCalledWith("/guest_hub");
  });

  test("confirm emergency call starts the call screen", async () => {
    const user = userEvent.setup();

    render(<EmergencyPage />);

    await user.click(screen.getByRole("button", { name: "Confirm Emergency Call" }));

    expect(screen.getByText("Emergency Call")).toBeInTheDocument();
    expect(screen.getByText("Calling emergency services...")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End Call" })).toBeInTheDocument();
  });

  test("call timer increases and status changes after three seconds", async () => {
    jest.useFakeTimers();

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    render(<EmergencyPage />);

    await user.click(screen.getByRole("button", { name: "Confirm Emergency Call" }));

    expect(screen.getByText("Calling emergency services...")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Connected to emergency operator")).toBeInTheDocument();
    expect(screen.getByText("00:03")).toBeInTheDocument();
  });

  test("end call returns to hub by default", async () => {
    const user = userEvent.setup();

    render(<EmergencyPage />);

    await user.click(screen.getByRole("button", { name: "Confirm Emergency Call" }));
    await user.click(screen.getByRole("button", { name: "End Call" }));

    expect(mockPush).toHaveBeenCalledWith("/hub");
  });

  test("end call returns to guest hub when opened from guest hub", async () => {
    const user = userEvent.setup();
    mockFromValue = "guest_hub";

    render(<EmergencyPage />);

    await user.click(screen.getByRole("button", { name: "Confirm Emergency Call" }));
    await user.click(screen.getByRole("button", { name: "End Call" }));

    expect(mockPush).toHaveBeenCalledWith("/guest_hub");
  });
});