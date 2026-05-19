import { render, screen } from "@testing-library/react";
import {
  SpeechProvider,
  useSpeechContext,
} from "@/app/context/SpeechContext";

function Consumer() {
  const { listening, transcript } = useSpeechContext();
  const transcriptValue = transcript || "empty";

  return (
    <div>
      <span>{listening ? "listening" : "idle"}</span>
      <span>{transcriptValue}</span>
    </div>
  );
}

describe("SpeechContext", () => {
  test("throws when used outside provider", () => {
    expect(() => render(<Consumer />)).toThrow(
      "useSpeechContext must be used inside SpeechProvider"
    );
  });

  test("provides default values", () => {
    render(
      <SpeechProvider>
        <Consumer />
      </SpeechProvider>
    );

    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("empty")).toBeInTheDocument();
  });
});
