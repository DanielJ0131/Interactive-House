import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIPage from "@/app/ai/page";
import { useGuestMode } from "@/app/hooks/useGuestMode";
import { doc, updateDoc } from "firebase/firestore";

const generateContentMock = jest.fn();
const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
  }),
  usePathname: () => "/ai",
}));

jest.mock("@/utils/firebaseConfig", () => ({
  db: {},
  model: {
    generateContent: (...args: unknown[]) => generateContentMock(...args),
  },
}));

jest.mock("@/app/hooks/useGuestMode", () => ({
  useGuestMode: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => "device-ref"),
  updateDoc: jest.fn(() => Promise.resolve()),
}));

jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => <div>{children}</div>,
}));

jest.mock("remark-gfm", () => ({
  __esModule: true,
  default: () => ({}),
}));

describe("AIPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGuestMode as jest.Mock).mockReturnValue(false);
  });

  test("renders guest gate when guest", () => {
    (useGuestMode as jest.Mock).mockReturnValue(true);

    render(<AIPage />);

    expect(screen.getByText("Sign in required")).toBeInTheDocument();
  });

  test("sends chat request and renders reply", async () => {
    const user = userEvent.setup();

    generateContentMock.mockResolvedValue({
      response: {
        text: () => '{"type":"chat","reply":"Hello from AI"}',
      },
    });

    render(<AIPage />);

    const input = screen.getByPlaceholderText("Write a command or a question...");

    await user.type(input, "Hello there{enter}");

    expect(generateContentMock).toHaveBeenCalled();

    expect(await screen.findByText("Hello from AI")).toBeInTheDocument();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  test("executes device command responses", async () => {
    const user = userEvent.setup();

    generateContentMock.mockResolvedValue({
      response: {
        text: () =>
          '{"type":"device_control","device":"door","state":"open","reply":"Opening the door."}',
      },
    });

    render(<AIPage />);

    const input = screen.getByPlaceholderText("Write a command or a question...");

    await user.type(input, "Open the door{enter}");

    await waitFor(() => {
      expect(doc).toHaveBeenCalledWith({}, "devices", "arduino");
      expect(updateDoc).toHaveBeenCalledWith("device-ref", {
        "door.state": "open",
      });
    });

    expect(await screen.findByText("Opening the door.")).toBeInTheDocument();
  });

  test("does not send messages in guest mode", async () => {
    (useGuestMode as jest.Mock).mockReturnValue(true);

    render(<AIPage />);

    expect(
      screen.queryByPlaceholderText("Write a command or a question...")
    ).not.toBeInTheDocument();

    expect(generateContentMock).not.toHaveBeenCalled();
  });

  test("handles access refusal text from the model", async () => {
    const user = userEvent.setup();

    generateContentMock.mockResolvedValue({
      response: {
        text: () => "I don't have access to that device.",
      },
    });

    render(<AIPage />);

    const input = screen.getByPlaceholderText("Write a command or a question...");

    await user.type(input, "Turn on the light{enter}");

    expect(
      await screen.findByText(
        "I understood the request, but the command format was invalid. Please try again."
      )
    ).toBeInTheDocument();
  });

  test("handles invalid JSON responses", async () => {
    const user = userEvent.setup();

    generateContentMock.mockResolvedValue({
      response: {
        text: () => "not json",
      },
    });

    render(<AIPage />);

    const input = screen.getByPlaceholderText("Write a command or a question...");

    await user.type(input, "Toggle something{enter}");

    expect(
      await screen.findByText(
        "I understood your message, but I could not format a valid command."
      )
    ).toBeInTheDocument();
  });

  test("extracts JSON embedded in a response", async () => {
    const user = userEvent.setup();

    generateContentMock.mockResolvedValue({
      response: {
        text: () =>
          'Sure! {"type":"device_control","device":"window","state":"open","reply":"Opening window."}',
      },
    });

    render(<AIPage />);

    const input = screen.getByPlaceholderText("Write a command or a question...");

    await user.type(input, "Open the window{enter}");

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith("device-ref", {
        "window.state": "open",
      });
    });

    expect(await screen.findByText("Opening window.")).toBeInTheDocument();
  });

  test("surfaces device update errors", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error("fail"));
    generateContentMock.mockResolvedValue({
      response: {
        text: () =>
          '{"type":"device_control","device":"buzzer","state":"on","reply":"Turning on buzzer."}',
      },
    });

    render(<AIPage />);

    const input = screen.getByPlaceholderText("Write a command or a question...");

    await user.type(input, "Turn on buzzer{enter}");

    expect(
      await screen.findByText("I couldn't complete that action. Please try again.")
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
