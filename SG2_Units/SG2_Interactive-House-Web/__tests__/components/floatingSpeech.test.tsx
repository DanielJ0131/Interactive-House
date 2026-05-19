import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FloatingSpeech from "@/app/components/FloatingSpeech";

const pushMock = jest.fn();
const pathnameMock = jest.fn();
const useSpeechMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: jest.fn(),
  }),
  usePathname: () => pathnameMock(),
}));

jest.mock("@/app/hooks/useSpeech", () => ({
  useSpeech: () => useSpeechMock(),
}));

describe("FloatingSpeech", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pathnameMock.mockReturnValue("/hub");
    useSpeechMock.mockReturnValue({
      listening: false,
      transcript: "",
      toggleListening: jest.fn(),
    });
  });

  test("hides on auth routes", () => {
    pathnameMock.mockReturnValue("/auth/login");

    render(<FloatingSpeech />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("shows transcript and toggles listening", async () => {
    const user = userEvent.setup();
    const toggleListening = jest.fn();

    useSpeechMock.mockReturnValue({
      listening: false,
      transcript: "Hello",
      toggleListening,
    });

    render(<FloatingSpeech />);

    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();

    await user.click(screen.getByRole("button"));

    expect(toggleListening).toHaveBeenCalled();
  });

  test("shows listening state", () => {
    useSpeechMock.mockReturnValue({
      listening: true,
      transcript: "",
      toggleListening: jest.fn(),
    });

    render(<FloatingSpeech />);

    expect(screen.getByRole("button").className).toContain("bg-red-500");
  });

  test("navigates when transcript mentions music", async () => {
    useSpeechMock.mockReturnValue({
      listening: false,
      transcript: "play music",
      toggleListening: jest.fn(),
    });

    render(<FloatingSpeech />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/music");
    });
  });
});
