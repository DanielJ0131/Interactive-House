import React, { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";

jest.mock("../../src/app/components/FloatingSpeech", () => ({
  __esModule: true,
  default: () => <div data-testid="floating-speech" />,
}));

jest.mock("../../src/app/context/SpeechContext", () => ({
  // Fix: Typed children correctly as ReactNode
  SpeechProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="speech-provider">{children}</div>
  ),
}));

describe("RootLayout", () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = (...args) => {
      // Fix: Convert all arguments to a single string to catch React's format string substitutions
      const message = args.join(" ");
      
      if (
        message.includes("cannot be a child of") || 
        message.includes("validateDOMNesting")
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  test("renders children and layout wrappers", () => {
    render(
      <RootLayout>
        <div>App content</div>
      </RootLayout>
    );

    expect(screen.getByText("App content")).toBeInTheDocument();
    expect(screen.getByTestId("speech-provider")).toBeInTheDocument();
    expect(screen.getByTestId("floating-speech")).toBeInTheDocument();
  });
});