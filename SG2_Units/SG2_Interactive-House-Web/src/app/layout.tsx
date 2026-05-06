import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SpeechProvider } from "./context/SpeechContext";
import FloatingSpeech from "./components/FloatingSpeech";

export const metadata: Metadata = {
  title: "Interactive House",
  description: "Smart control for your modern living space.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* We remove the fixed width here so it can expand on Desktop */}
          <SpeechProvider>
          <div className="min-h-screen flex flex-col relative overflow-x-hidden">
            {children}
          </div>

          {/* floating button lives outside layout flow */}
          <FloatingSpeech />
        </SpeechProvider>
      </body>
    </html>
  );
}