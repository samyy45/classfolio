"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email.trim()) { setError("Email is required."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Enter a valid email address."); return; }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setError("Too many requests. Try again later.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccessMessage(data.message || "If an account with that email exists, we've sent a password reset link. Check your inbox.");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`${inter.className} flex min-h-screen flex-col md:flex-row`}>
      <div className="hidden md:flex md:w-1/2 md:items-center md:justify-center md:bg-[#1E1E2E]">
        <div className="px-12 text-center">
          <h1 className="text-4xl font-bold text-white">ClassFolio</h1>
          <p className="mt-3 text-lg text-[#A0A0B0]">Student Information System</p>
        </div>
      </div>

      <div className="flex min-h-screen flex-1 items-center justify-center bg-[#F8F9FA] p-4 md:w-1/2 md:bg-white md:p-8">
        <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-8 shadow-sm">
          <div className="mb-6 text-center md:hidden">
            <h1 className="text-2xl font-bold text-[#111827]">ClassFolio</h1>
            <p className="mt-1 text-sm text-[#6B7280]">Student Information System</p>
          </div>

          <h2 className="mb-2 text-center text-xl font-semibold text-[#111827] md:text-left">Reset Your Password</h2>
          
          {successMessage ? (
            <div className="text-center md:text-left">
              <p className="mb-6 text-sm text-[#16A34A]">{successMessage}</p>
              <Link href="/login" className="font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline">
                ← Back to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-6 text-center text-sm text-[#6B7280] md:text-left">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#111827]">Email</label>
                  <input
                    id="email" type="email" autoComplete="email" placeholder="faculty@college.edu"
                    value={email} onChange={(e) => setEmail(e.target.value)} disabled={isSubmitting}
                    className="w-full rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? (<><Spinner /><span>Sending Link…</span></>) : "Send Reset Link"}
                </button>

                {error && <p className="text-center text-sm text-[#DC2626]" role="alert">{error}</p>}
              </form>

              <p className="mt-6 text-center text-sm text-[#6B7280]">
                <Link href="/login" className="font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline">
                  ← Back to Login
                </Link>
              </p>
            </>
          )}

          <p className="mt-6 text-center text-xs text-[#6B7280]">Authorized personnel only. All access is logged.</p>
        </div>
      </div>
    </div>
  );
}
