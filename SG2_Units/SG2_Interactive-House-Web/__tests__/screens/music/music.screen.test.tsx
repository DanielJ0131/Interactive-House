import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MusicPage from "@/app/music/page";
import { collection, getDocs } from "firebase/firestore";

const pushMock = jest.fn();
const closeMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
  }),
  usePathname: () => "/music",
}));

jest.mock("@/utils/firebaseConfig", () => ({
  auth: {},
  db: {},
}));

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "music-collection"),
  getDocs: jest.fn(),
}));

describe("MusicPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getDocs as jest.Mock).mockResolvedValue({
      docs: [
        {
          id: "song-1",
          data: () => ({
            name: "Alarm Melody",
            artist: "Group 4",
            frequencies: [440, 660, 880],
          }),
        },
        {
          id: "song-2",
          data: () => ({
            name: "Doorbell Tune",
            artist: "Interactive House",
            frequencies: [330, 440],
          }),
        },
      ],
    });

    closeMock.mockClear();

    const mockAudioContext = {
      currentTime: 0,
      destination: {},
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

    (window as any).AudioContext = jest.fn(() => mockAudioContext);
    (window as any).webkitAudioContext = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("loads and displays songs from Firestore", async () => {
    render(<MusicPage />);

    expect(collection).toHaveBeenCalledWith({}, "music");

    expect(await screen.findByText("Alarm Melody")).toBeInTheDocument();
    expect(screen.getByText("Group 4")).toBeInTheDocument();

    expect(screen.getByText("Doorbell Tune")).toBeInTheDocument();

    expect(screen.getAllByText("Interactive House").length).toBeGreaterThan(0);
  });

  test("renders the music page layout and back link", async () => {
    render(<MusicPage />);

    expect(screen.getByRole("heading", { name: "Music" })).toBeInTheDocument();
    expect(screen.getByText("Music Control")).toBeInTheDocument();
    expect(screen.getByText("Available Tracks")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Back to hub/i })).toHaveAttribute(
      "href",
      "/hub"
    );

    expect(await screen.findByText("Alarm Melody")).toBeInTheDocument();
  });

  test("renders and changes speed buttons", async () => {
    const user = userEvent.setup();

    render(<MusicPage />);

    await screen.findByText("Alarm Melody");

    const slowButton = screen.getByRole("button", { name: "SLOW" });
    const normalButton = screen.getByRole("button", { name: "NORMAL" });
    const fastButton = screen.getByRole("button", { name: "FAST" });

    expect(slowButton).toBeInTheDocument();
    expect(normalButton).toBeInTheDocument();
    expect(fastButton).toBeInTheDocument();

    expect(normalButton.className).toContain("bg-white");

    await user.click(fastButton);

    expect(fastButton.className).toContain("bg-white");
  });

  test("clicking play starts the audio context and shows stop button", async () => {
    jest.useFakeTimers();

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    render(<MusicPage />);

    await screen.findByText("Alarm Melody");

    await user.click(screen.getAllByRole("button", { name: "PLAY" })[0]);

    expect((window as any).AudioContext).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument();

    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  test("clicking stop closes the audio context", async () => {
    jest.useFakeTimers();

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    render(<MusicPage />);

    await screen.findByText("Alarm Melody");

    await user.click(screen.getAllByRole("button", { name: "PLAY" })[0]);
    await user.click(screen.getByRole("button", { name: "STOP" }));

    await waitFor(() => {
      expect(closeMock).toHaveBeenCalled();
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });
  });
});