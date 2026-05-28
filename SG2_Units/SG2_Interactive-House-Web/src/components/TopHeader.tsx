"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Brain, Microphone, House, PhoneCall, List, X } from "@phosphor-icons/react";
import { signOut } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
import { useEffect, useState } from "react";
import { useGuestMode } from "@/app/hooks/useGuestMode";

const themes = [
  { name: "Default", value: "" },
  { name: "Protanopia", value: "theme-protanopia" },
  { name: "Deuteranopia", value: "theme-deuteranopia" },
  { name: "Tritanopia", value: "theme-tritanopia" },
];

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isGuest = useGuestMode();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  };

  const handleLogout = async () => {
    if (isGuest) return;
    await signOut(auth);

    document.cookie =
      "auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    window.location.href = "/auth/login";
  };

  const handleEmergency = () => {
    router.push("/emergency?from=hub");
  };

  return (
    <>
      <header className="w-full border-b border-[var(--color-border)] bg-black/50 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="text-[var(--text-primary)] font-bold text-lg tracking-wide flex items-center gap-2">
            Interactive House
            {isGuest && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                Guest
              </span>
            )}
          </div>

          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-6">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 text-sm transition ${active
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

            <div className="flex items-center gap-3 md:gap-4">
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle menu"
                className="md:hidden flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-[var(--text-primary)] hover:bg-[var(--color-surface-elevated)]"
              >
                {mobileMenuOpen ? <X size={22} /> : <List size={22} />}
              </button>

              <button
                onClick={handleEmergency}
                aria-label="Emergency"
                className="relative group flex items-center gap-2 rounded-full border border-red-400/50 bg-red-500/15 p-2.5 md:px-4 md:py-2 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.25)] transition-all duration-300 hover:scale-105 hover:bg-red-500/25 hover:text-red-100 hover:shadow-[0_0_28px_rgba(239,68,68,0.45)]"
              >
                <span className="absolute -inset-1 rounded-full bg-red-500/20 blur-md opacity-70 animate-pulse" />

                <span className="relative flex items-center justify-center">
                  {/* Made the icon slightly larger on mobile for better touch targeting */}
                  <PhoneCall weight="fill" className="w-[22px] h-[22px] md:w-[18px] md:h-[18px]" />
                </span>

                <span className="relative text-xs font-black tracking-[0.16em] uppercase hidden md:inline">
                  Emergency
                </span>
              </button>

              {/* Wrapped auth links in a hidden md:flex container so they only show in the dropdown on mobile */}
              <div className="hidden md:flex items-center gap-3">
                {isGuest ? (
                  <>
                    <Link
                      href="/auth/login"
                      className="text-sm text-[var(--color-accent)] transition hover:text-[var(--color-accent)]/90"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="text-sm text-white/70 transition hover:text-white"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="text-sm text-red-400 transition hover:text-red-300"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-full z-40 w-full border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl max-h-[calc(100vh-70px)] overflow-y-auto">
            <div className="mx-auto max-w-6xl px-6 py-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  handleEmergency();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              >
                <PhoneCall size={18} weight="fill" />
                Emergency
              </button>

              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--color-accent-soft)]"
                  >
                    <Icon size={20} />
                    {item.name}
                  </Link>
                );
              })}

              <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)] mt-1">
                <div className="text-xs font-bold text-[var(--color-muted-text)] px-1">Colorblind Mode</div>
                <div className="flex flex-col gap-1">
                  {themes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        setTheme(theme.value);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition hover:bg-[var(--color-accent-soft)] ${currentTheme === theme.value ? "text-[var(--color-accent)]" : "text-[var(--text-primary)]"
                        }`}
                    >
                      <span>{theme.name}</span>
                      {currentTheme === theme.value && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-[var(--color-border)] px-1">
                  {isGuest ? (
                    <div className="flex items-center gap-4">
                      <Link
                        href="/auth/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium text-[var(--color-accent)]"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/auth/signup"
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-sm font-medium text-white/70"
                      >
                        Sign Up
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-sm font-medium text-red-400 hover:text-red-300"
                    >
                      Logout
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="h-16 md:h-16" />
    </>
  );
}