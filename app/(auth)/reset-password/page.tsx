"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

const inter = Inter({ subsets: ["latin"] });

// Module-level singleton — created once at module load, never recreated on
// re-renders. This is the single client instance used for both setSession()
// and the subsequent updateUser() call so they share the same session state.
const supabase = createClient();

type PageState = "loading" | "ready" | "invalid";

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    // Manual hash-parsing + setSession() approach.
    //
    // WHY: This app uses @supabase/ssr which is built around PKCE/cookie-based
    // auth. Supabase's password-recovery emails produce a URL with the
    // access_token in the URL HASH (#access_token=...&type=recovery), which is
    // the older implicit-grant style. The @supabase/ssr client's automatic
    // detectSessionInUrl does not reliably process this hash the same way the
    // classic @supabase/supabase-js client does, causing all event-based
    // approaches (onAuthStateChange + PASSWORD_RECOVERY) to be unreliable.
    //
    // This approach bypasses automatic detection entirely: parse the hash
    // directly, validate the required tokens, then call setSession() to
    // establish a real, valid session in the client. updateUser() will then
    // work correctly against that session.
    async function establishSession() {
      const hash = window.location.hash;

      // No hash at all → not a recovery link, show invalid immediately.
      if (!hash || hash.length < 2) {
        setPageState("invalid");
        return;
      }

      const params = new URLSearchParams(hash.substring(1)); // strip leading '#'

      // Supabase sometimes encodes an error directly in the hash
      // (e.g. error_code=otp_expired for already-used or expired links).
      const errorCode = params.get("error_code");
      if (errorCode) {
        console.error(
          "[reset-password] Recovery link carried an error:",
          errorCode,
          params.get("error_description")
        );
        setPageState("invalid");
        return;
      }

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      // All three fields must be present and type must be 'recovery'.
      if (!accessToken || !refreshToken || type !== "recovery") {
        setPageState("invalid");
        return;
      }

      // Establish the session explicitly. After this succeeds, supabase.auth
      // has a real session and updateUser() will work correctly.
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error(
          "[reset-password] setSession failed:",
          sessionError.message
        );
        setPageState("invalid");
        return;
      }

      setPageState("ready");
    }

    void establishSession();
    // No cleanup needed — no subscriptions or timers to tear down.
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      // setSession() above established a real session, so updateUser() works
      // exactly as it would after any other normal auth method.
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(
          updateError.message ||
            "Failed to update password. The link might be expired."
        );
        return;
      }

      setSuccessMessage("Password updated successfully.");

      // Sign out so they can sign in cleanly with the new password.
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push("/login");
      }, 2000);
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

          <h2 className="mb-6 text-center text-xl font-semibold text-[#111827] md:text-left">
            Set a New Password
          </h2>

          {pageState === "loading" ? (
            <div className="flex justify-center p-8">
              <svg
                className="h-8 w-8 animate-spin text-[#4F46E5]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : pageState === "invalid" ? (
            <div className="text-center md:text-left">
              <p className="mb-6 text-sm text-[#DC2626]">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline"
              >
                ← Back to Forgot Password
              </Link>
            </div>
          ) : successMessage ? (
            <div className="text-center md:text-left">
              <p className="mb-6 text-sm text-[#16A34A]">{successMessage}</p>
              <p className="text-sm text-[#6B7280]">Redirecting to login...</p>
              <Link
                href="/login"
                className="mt-4 inline-block font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline"
              >
                Go to Login manually
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-[#111827]"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 pr-10 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    disabled={isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B7280] hover:text-[#111827] disabled:cursor-not-allowed"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-[#111827]"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 pr-10 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    disabled={isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B7280] hover:text-[#111827] disabled:cursor-not-allowed"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    <span>Updating…</span>
                  </>
                ) : (
                  "Update Password"
                )}
              </button>

              {error && (
                <p className="text-center text-sm text-[#DC2626]" role="alert">
                  {error}
                </p>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-xs text-[#6B7280]">
            Authorized personnel only. All access is logged.
          </p>
        </div>
      </div>
    </div>
  );
}
