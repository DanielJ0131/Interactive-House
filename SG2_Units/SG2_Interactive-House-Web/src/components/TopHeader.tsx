"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, Microphone, House, PhoneCall, Palette } from "@phosphor-icons/react";
import { signOut } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
import { useEffect, useState } from "react";

const themes = [
  { name: "Default", value: "" },
  { name: "Protanopia", value: "theme-protanopia" },
  { name: "Deuteranopia", value: "theme-deuteranopia" },
  { name: "Tritanopia", value: "theme-tritanopia" },
];

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("");

  const nav = [
    { name: "Hub", icon: House, href: "/hub" },
    { name: "AI", icon: Brain, href: "/ai" },
    { name: "Music", icon: Microphone, href: "/music" },
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") ?? "";

    document.documentElement.className = savedTheme;
    setCurrentTheme(savedTheme);
  }, []);

  const setTheme = (theme: string) => {
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
    setCurrentTheme(theme);
    setThemeMenuOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);

    document.cookie =
      "auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    window.location.href = "/auth/login";
  };

  const handleEmergency = () => {
    router.push("/emergency?from=hub");
  };

  const currentThemeName =
    themes.find((theme) => theme.value === currentTheme)?.name ?? "Default";

  return (
    <header className="w-full border-b border-[var(--color-border)] bg-black/50 backdrop-blur-sm relative z-50">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <div className="text-[var(--text-primary)] font-bold text-lg tracking-wide">
          Interactive House
        </div>

        <div className="flex items-center gap-8">
          <nav className="flex items-center gap-6">
            <button
              onClick={handleEmergency}
              className="relative group flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/15 px-4 py-2 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.25)] transition-all duration-300 hover:scale-105 hover:bg-red-500/25 hover:text-red-100 hover:shadow-[0_0_28px_rgba(239,68,68,0.45)]"
            >
              <span className="absolute -inset-1 rounded-full bg-red-500/20 blur-md opacity-70 animate-pulse" />

              <span className="relative flex items-center justify-center">
                <PhoneCall size={18} weight="fill" />
              </span>

              <span className="relative text-xs font-black tracking-[0.16em] uppercase">
                Emergency
              </span>
            </button>

            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 text-sm transition ${
                    active
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-muted-text)] hover:text-[var(--color-accent)]"
                  }`}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-bold text-[var(--text-primary)] transition hover:bg-[var(--color-surface-elevated)]"
              >
                <Palette size={16} weight="fill" />
                {currentThemeName}
              </button>

              {themeMenuOpen && (
                <div className="absolute right-0 z-50 mt-3 w-48 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl backdrop-blur-md">
                  {themes.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => setTheme(theme.value)}
                      className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-[var(--color-accent-soft)] ${
                        currentTheme === theme.value
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <span>{theme.name}</span>

                      {currentTheme === theme.value && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="text-sm text-red-400 transition hover:text-red-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}