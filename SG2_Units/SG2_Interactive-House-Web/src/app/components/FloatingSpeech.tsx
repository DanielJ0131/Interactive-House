"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@mdi/react";
import { mdiMicrophone } from "@mdi/js";
import { useSpeech } from "../hooks/useSpeech";
import { usePathname } from "next/navigation";

export default function FloatingSpeech() {
  const router = useRouter();
  const pathname = usePathname();

  const { listening, transcript, toggleListening } = useSpeech();

  useEffect(() => {
    //debug
    if (!transcript) return;

    const text = transcript.toLowerCase();

    if (text.includes("hub")) {
      router.push("/hub");
    }

    if (text.includes("ai")) {
      router.push("/ai");
    }

    if (text.includes("music")) {
      router.push("/music");
    }
  }, [transcript, router]);
  
  //exclude button from login pages
  if (pathname.startsWith("/auth")) {
    return null;
  }

  return (
    <div className="fixed top-28 right-5 z-[1000] flex items-start gap-3">
      {transcript && (
        <div className="max-w-[260px] rounded-2xl bg-white text-black px-4 py-3 shadow-xl">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Transcript
          </p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      <button
        onClick={toggleListening}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all ${
          listening ? "scale-110 bg-red-500" : "bg-[#0EA5E9]"
        }`}
      >
        <Icon path={mdiMicrophone} size={1.1} color="white" />
      </button>
    </div>
  );
}