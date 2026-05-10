"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SpeechContextType = {
  listening: boolean;
  setListening: React.Dispatch<React.SetStateAction<boolean>>;
  transcript: string;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
};

const SpeechContext = createContext<SpeechContextType | null>(null);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  return (
    <SpeechContext.Provider value={{ listening, setListening, transcript, setTranscript }}>
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeechContext() {
  const context = useContext(SpeechContext);

  if (!context) {
    throw new Error("useSpeechContext must be used inside SpeechProvider");
  }

  return context;
}