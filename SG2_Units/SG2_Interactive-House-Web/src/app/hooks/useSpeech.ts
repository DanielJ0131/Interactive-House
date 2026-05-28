"use client";

import { useEffect, useRef } from "react";
import { useSpeechContext } from "../context/SpeechContext";

type RecognitionInstance ={
      continuous: boolean;
   interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
};

export function useSpeech(){
  const { listening, setListening, transcript, setTranscript } = useSpeechContext();
  const recognitionRef = useRef<RecognitionInstance | null>(null);


  useEffect(() =>{
    if (typeof window === "undefined") return;

    const SpeechRecognitionAPI =
   (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;



    if (!SpeechRecognitionAPI){
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition: RecognitionInstance = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

          recognition.onresult = (event: any) =>{
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;

          if (event.results[i].isFinal){
            finalTranscript += text + " ";
          } else {
      interimTranscript += text;
    }
  }

  const fullTranscript = (finalTranscript + interimTranscript).trim();

  setTranscript(fullTranscript);

  if (fullTranscript){
    setTimeout(() => {
      recognition.stop();
      setListening(false);
    }, 2000);
  }
};

    recognition.onend = () =>{
      
      
      setListening(false);
    };

    recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [setListening, setTranscript]);

  const startListening = () =>   {
    if (!recognitionRef.current || listening) return;
    setTranscript("");
    recognitionRef.current.start();
    setListening(true);
  };

  const stopListening = () =>{
    if (!recognitionRef.current || !listening) return;
    recognitionRef.current.stop();
    setListening(false);
  };


  const toggleListening = () =>{
       if (listening) stopListening();
    else startListening();
  };

      return {
        listening,
        transcript,
        startListening,
        stopListening,
        toggleListening,
      };
    }