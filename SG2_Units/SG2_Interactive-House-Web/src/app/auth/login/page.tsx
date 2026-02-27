"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/utils/firebaseConfig";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/hub");
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.code ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="text-[#0EA5E9] hover:underline">
          ← Back
        </Link>

        <div className="mt-6 rounded-3xl bg-[#0A122B] border border-white/5 p-8 shadow-2xl">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#0B1636] flex items-center justify-center">
            <div className="h-8 w-8 rounded-xl bg-[#0EA5E9] flex items-center justify-center">
              <span className="text-[#0B1636] font-black">🏠</span>
            </div>
          </div>

          <h1 className="mt-5 text-3xl font-bold text-center">Welcome Back</h1>
          <p className="mt-2 text-center text-white/60">Sign in to control your home</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm text-white/70">Username (Email)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="name@example.com"
                className="mt-2 w-full rounded-2xl bg-[#070B18] border border-white/10 px-4 py-4 outline-none focus:border-[#0EA5E9]"
              />
            </div>

            <div>
              <label className="text-sm text-white/70">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="mt-2 w-full rounded-2xl bg-[#070B18] border border-white/10 px-4 py-4 outline-none focus:border-[#0EA5E9]"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-center rounded-2xl bg-[#0EA5E9] py-4 font-semibold text-lg text-[#071022] shadow-xl shadow-[#0EA5E9]/10 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="text-center text-white/60">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="text-[#0EA5E9] hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}