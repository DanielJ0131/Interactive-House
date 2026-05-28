import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MusicPage from "@/app/music/page";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";

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
  auth: {
    currentUser: {
      email: "admin@example.com",
      uid: "admin-uid",
    },
  },
  db: {},
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => "music-collection"),
  doc: jest.fn(() => ({ id: "mock-doc-ref" })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
}));

describe("MusicPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback({
        email: "admin@example.com",
        uid: "admin-uid",
      });

      return jest.fn();
    });

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        role: "admin",
      }),
    });

    (onSnapshot as jest.Mock).mockImplementation((_collectionRef, callback) => {
      callback({
        forEach: (callbackFn: any) => {
          [
            {
              id: "song-1",
              data: () => ({
                name: "Alarm Melody",
                artist: "Group 4",
                frequencies: [440, 660, 880],
                noteDelays: [100, 100, 100],
              }),
            },
            {
              id: "song-2",
              data: () => ({
                name: "Doorbell Tune",
                artist: "Interactive House",
                frequencies: [330, 440],
                noteDelays: [100, 100],
              }),
            },
          ].forEach(callbackFn);
        },
      });

      return jest.fn();
    });

    closeMock.mockClear();

    const mockGain = {
      gain: {
        value: 0,
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };

    const mockOscillator = {
      type: "sine",
      frequency: {
        value: 0,
        setValueAtTime: jest.fn(),
      },
      detune: {
        value: 0,
      },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };

    const mockConvolver = {
      buffer: null,
      connect: jest.fn(),
      context: null as any,
    };

    const mockAudioContext = {
      state: "running",
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      close: closeMock,
      resume: jest.fn(() => Promise.resolve()),
      createOscillator: jest.fn(() => mockOscillator),
      createGain: jest.fn(() => mockGain),
      createConvolver: jest.fn(() => mockConvolver),
      createBuffer: jest.fn(() => ({
        numberOfChannels: 2,
        getChannelData: jest.fn(() => new Float32Array(10)),
      })),
    };

    mockConvolver.context = mockAudioContext;

    (window as any).AudioContext = jest.fn(() => mockAudioContext);
    (window as any).webkitAudioContext = undefined;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("loads and displays songs from Firestore", async () => {
    render(<MusicPage />);

    expect(collection).toHaveBeenCalledWith({}, "music");

    expect(await screen.findByText("Alarm Melody")).toBeInTheDocument();
    expect(screen.getAllByText("Group 4").length).toBeGreaterThan(0);

    expect(screen.getAllByText("Doorbell Tune").length).toBeGreaterThan(0);
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

    await user.click(fastButton);

    expect(fastButton.className).toContain("bg-[var(--color-accent)]");
  });

  test("clicking play starts the audio context and shows stop button", async () => {
    jest.useFakeTimers();

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    render(<MusicPage />);

    await screen.findByText("Alarm Melody");

    await act(async () => {
      await user.click(screen.getAllByRole("button", { name: "PLAY" })[0]);
    });

    expect((window as any).AudioContext).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "STOP" })).toBeInTheDocument();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "STOP" }));
    });
  });

  test("clicking stop closes the audio context", async () => {
    jest.useFakeTimers();

    const user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    render(<MusicPage />);

    await screen.findByText("Alarm Melody");

    await act(async () => {
      await user.click(screen.getAllByRole("button", { name: "PLAY" })[0]);
    });

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "STOP" }));
    });

    await waitFor(() => {
      expect(closeMock).toHaveBeenCalled();
    });
  });

  test("checks authenticated admin user", async () => {
    render(<MusicPage />);

    await screen.findByText("Alarm Melody");

    expect(onAuthStateChanged).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
  });
});