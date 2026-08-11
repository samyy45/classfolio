"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

type Tab = "faculty" | "hod";

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("faculty");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password)      { setError("Password is required."); return; }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = (await res.json()) as { role?: "hod" | "faculty"; error?: string };

      if (res.status === 429) {
        setError("Too many login attempts. Try again in 15 minutes.");
        return;
      }
      if (res.status === 401) {
        setError("Invalid email or password");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // 200 — redirect based on role
      if (data.role === "hod") {
        router.push("/hod/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`${inter.className} flex min-h-screen flex-col md:flex-row`}>
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 md:items-center md:justify-center md:bg-[#1E1E2E]">
        <div className="px-12 text-center">
          <h1 className="text-4xl font-bold text-white">ClassFolio</h1>
          <p className="mt-3 text-lg text-[#A0A0B0]">Student Information System</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex min-h-screen flex-1 items-center justify-center bg-[#F8F9FA] p-4 md:w-1/2 md:bg-white md:p-8">
        <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-8 shadow-sm">
          {/* Mobile-only branding */}
          <div className="mb-6 text-center md:hidden">
            <h1 className="text-2xl font-bold text-[#111827]">ClassFolio</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Student Information System</p>
          </div>

          <h2 className="mb-6 text-center text-xl font-semibold text-[#111827] md:text-left">Sign In</h2>

          {/* Faculty / HOD tab toggle */}
          <div className="mb-6 flex rounded-md border border-[#E5E7EB] p-1">
            <button type="button" onClick={() => { setTab("faculty"); setError(""); }}
              className={`flex-1 rounded-[6px] px-4 py-2.5 text-sm font-medium transition-colors ${tab === "faculty" ? "bg-[#4F46E5] text-white" : "bg-transparent text-[#6B7280] hover:text-[#111827]"}`}>
              Faculty
            </button>
            <button type="button" onClick={() => { setTab("hod"); setError(""); }}
              className={`flex-1 rounded-[6px] px-4 py-2.5 text-sm font-medium transition-colors ${tab === "hod" ? "bg-[#4F46E5] text-white" : "bg-transparent text-[#6B7280] hover:text-[#111827]"}`}>
              HOD
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#111827]">Email</label>
              <input
                id="email" type="email" autoComplete="email" placeholder="faculty@college.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting}
                className="w-full rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#111827]">Password</label>
                {tab === "faculty" && (
                  <Link href="/forgot-password" className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <input
                  id="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting}
                  className="w-full rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 pr-10 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button type="button" onClick={() => setShowPassword((p) => !p)} disabled={isSubmitting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B7280] hover:text-[#111827] disabled:cursor-not-allowed"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70">
              {isSubmitting ? (<><Spinner /><span>Signing in…</span></>) : "Sign In"}
            </button>

            {error && <p className="text-center text-sm text-[#DC2626]" role="alert">{error}</p>}
          </form>

          {tab === "faculty" && (
            <p className="mt-6 text-center text-sm text-[#6B7280]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline">Register here</Link>
            </p>
          )}

          <p className="mt-6 text-center text-xs text-[#6B7280]">Authorized personnel only. All access is logged.</p>
        </div>
      </div>
    </div>
  );
}
