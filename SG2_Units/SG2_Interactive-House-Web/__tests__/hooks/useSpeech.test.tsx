import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeechProvider } from "@/app/context/SpeechContext";
import { useSpeech } from "@/app/hooks/useSpeech";

let recognitionInstance: any;
const startMock = jest.fn();
const stopMock = jest.fn();

function SpeechHarness() {
  const { listening, transcript, startListening, stopListening, toggleListening } =
    useSpeech();

  return (
    <div>
      <span data-testid="listening">{listening ? "yes" : "no"}</span>
      <span data-testid="transcript">{transcript}</span>
      <button onClick={startListening}>start</button>
      <button onClick={stopListening}>stop</button>
      <button onClick={toggleListening}>toggle</button>
    </div>
  );
}

describe("useSpeech", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const SpeechRecognitionMock = jest.fn().mockImplementation(() => {
      recognitionInstance = {
        continuous: false,
        interimResults: false,
        lang: "",
        start: startMock,
        stop: stopMock,
        onresult: null,
        onend: null,
        onerror: null,
      };

      return recognitionInstance;
    });

    (window as any).SpeechRecognition = SpeechRecognitionMock;
    (window as any).webkitSpeechRecognition = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("starts and stops recognition", async () => {
    const user = userEvent.setup();

    render(
      <SpeechProvider>
        <SpeechHarness />
      </SpeechProvider>
    );

    await waitFor(() => expect(recognitionInstance).toBeDefined());

    await user.click(screen.getByRole("button", { name: "start" }));

    expect(startMock).toHaveBeenCalled();
    expect(screen.getByTestId("listening")).toHaveTextContent("yes");

    await user.click(screen.getByRole("button", { name: "stop" }));

    expect(stopMock).toHaveBeenCalled();
    expect(screen.getByTestId("listening")).toHaveTextContent("no");
  });

  test("updates transcript and auto-stops after results", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <SpeechProvider>
        <SpeechHarness />
      </SpeechProvider>
    );

    await waitFor(() => expect(recognitionInstance).toBeDefined());

    await user.click(screen.getByRole("button", { name: "start" }));

    const resultItem: any = [{ transcript: "Hello" }];
    resultItem.isFinal = true;

    act(() => {
      recognitionInstance.onresult?.({ results: [resultItem] });
    });

    expect(screen.getByTestId("transcript")).toHaveTextContent("Hello");

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(stopMock).toHaveBeenCalled();
    expect(screen.getByTestId("listening")).toHaveTextContent("no");
  });

  test("handles recognition error", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SpeechProvider>
        <SpeechHarness />
      </SpeechProvider>
    );

    await waitFor(() => expect(recognitionInstance).toBeDefined());

    await user.click(screen.getByRole("button", { name: "start" }));

    act(() => {
      recognitionInstance.onerror?.({ error: "network" });
    });

    expect(screen.getByTestId("listening")).toHaveTextContent("no");

    consoleSpy.mockRestore();
  });

  test("warns when speech recognition is unsupported", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    (window as any).SpeechRecognition = undefined;
    (window as any).webkitSpeechRecognition = undefined;

    render(
      <SpeechProvider>
        <SpeechHarness />
      </SpeechProvider>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "Speech recognition is not supported in this browser."
    );

    consoleSpy.mockRestore();
  });
});
