"use client";

import Link from "next/link";
import { LockKey, ArrowLeft } from "@phosphor-icons/react";

type GuestGateProps = {
  title: string;
  message: string;
};

export default function GuestGate({ title, message }: GuestGateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6">
      <div className="relative h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[var(--color-accent-soft)] opacity-70 blur-lg" />
        <LockKey size={40} weight="duotone" className="text-[var(--color-accent)] relative" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-white/50 text-sm max-w-[360px]">{message}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/auth/login"
          className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black shadow-lg"
        >
          Log In
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white/80 hover:text-white transition"
        >
          Sign Up
        </Link>
      </div>

      <Link
        href="/hub"
        className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-[var(--color-accent)] transition"
      >
        <ArrowLeft size={14} />
        Back to Hub
      </Link>
    </div>
  );
}
