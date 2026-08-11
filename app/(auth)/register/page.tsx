"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

type FormFields = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  staffCode: string;
};

type FieldErrors = Partial<Record<keyof FormFields, string>>;

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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

function validateField(name: keyof FormFields, values: FormFields): string | undefined {
  switch (name) {
    case "fullName":
      if (!values.fullName.trim()) return "Full name is required.";
      return undefined;
    case "email":
      if (!values.email.trim()) return "College email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Enter a valid email address.";
      return undefined;
    case "password":
      if (!values.password) return "Password is required.";
      if (values.password.length < 8) return "Password must be at least 8 characters.";
      return undefined;
    case "confirmPassword":
      if (!values.confirmPassword) return "Please confirm your password.";
      if (values.confirmPassword !== values.password) return "Passwords do not match.";
      return undefined;
    case "staffCode":
      if (!values.staffCode.trim()) return "Staff registration code is required.";
      return undefined;
    default:
      return undefined;
  }
}

function validateAll(values: FormFields): FieldErrors {
  const errors: FieldErrors = {};
  (Object.keys(values) as (keyof FormFields)[]).forEach((key) => {
    const msg = validateField(key, values);
    if (msg) errors[key] = msg;
  });
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormFields>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    staffCode: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");

  function updateField(name: keyof FormFields, value: string) {
    const next = { ...form, [name]: value };
    setForm(next);
    if (touched[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, next) }));
    }
    if (name === "password" && touched.confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: validateField("confirmPassword", next) }));
    }
  }

  function handleBlur(name: keyof FormFields) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, form) }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGeneralError("");

    const errors = validateAll(form);
    setFieldErrors(errors);
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true, staffCode: true });

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          registration_code: form.staffCode,
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (res.status === 429) {
        setGeneralError("Too many attempts. Try again later.");
        return;
      }
      if (res.status === 403) {
        setGeneralError("Invalid staff registration code. Contact your HOD.");
        return;
      }
      if (res.status === 400) {
        setGeneralError(data.error ?? "Validation failed. Please check your inputs.");
        return;
      }
      if (res.status === 500) {
        setGeneralError("Server error. Please try again.");
        return;
      }
      if (!res.ok) {
        setGeneralError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // 200 — success
      router.push("/dashboard");
    } catch {
      setGeneralError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-[6px] border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={`${inter.className} flex min-h-screen items-center justify-center bg-[#F8F9FA] p-4`}>
      <div className="w-full max-w-md rounded-lg border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#111827]">Create Faculty Account</h1>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-[#111827]">Full Name</label>
            <input
              id="fullName" type="text" autoComplete="name"
              value={form.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              onBlur={() => handleBlur("fullName")}
              disabled={isSubmitting}
              aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
              aria-invalid={!!fieldErrors.fullName}
              className={inputClass}
            />
            {fieldErrors.fullName && <p id="fullName-error" className="mt-1 text-sm text-[#DC2626]" role="alert">{fieldErrors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#111827]">College Email</label>
            <input
              id="email" type="email" autoComplete="email" placeholder="faculty@college.edu"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              disabled={isSubmitting}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
              aria-invalid={!!fieldErrors.email}
              className={inputClass}
            />
            {fieldErrors.email && <p id="email-error" className="mt-1 text-sm text-[#DC2626]" role="alert">{fieldErrors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#111827]">Password</label>
            <div className="relative">
              <input
                id="password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                aria-invalid={!!fieldErrors.password}
                className={`${inputClass} pr-10`}
              />
              <button type="button" onClick={() => setShowPassword((p) => !p)} disabled={isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B7280] hover:text-[#111827] disabled:cursor-not-allowed"
                aria-label={showPassword ? "Hide password" : "Show password"}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {fieldErrors.password && <p id="password-error" className="mt-1 text-sm text-[#DC2626]" role="alert">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#111827]">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                disabled={isSubmitting}
                aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                aria-invalid={!!fieldErrors.confirmPassword}
                className={`${inputClass} pr-10`}
              />
              <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} disabled={isSubmitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#6B7280] hover:text-[#111827] disabled:cursor-not-allowed"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                <EyeIcon open={showConfirmPassword} />
              </button>
            </div>
            {fieldErrors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-sm text-[#DC2626]" role="alert">{fieldErrors.confirmPassword}</p>}
          </div>

          {/* Staff Registration Code */}
          <div>
            <label htmlFor="staffCode" className="mb-1.5 block text-sm font-medium text-[#111827]">Staff Registration Code</label>
            <input
              id="staffCode" type="text" autoComplete="off"
              value={form.staffCode}
              onChange={(e) => updateField("staffCode", e.target.value)}
              onBlur={() => handleBlur("staffCode")}
              disabled={isSubmitting}
              aria-describedby={fieldErrors.staffCode ? "staffCode-error" : undefined}
              aria-invalid={!!fieldErrors.staffCode}
              className={inputClass}
            />
            {fieldErrors.staffCode && <p id="staffCode-error" className="mt-1 text-sm text-[#DC2626]" role="alert">{fieldErrors.staffCode}</p>}
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (<><Spinner /><span>Creating account…</span></>) : "Create Account"}
          </button>

          {generalError && (
            <p className="text-center text-sm text-[#DC2626]" role="alert">{generalError}</p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-[#6B7280]">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-[#4F46E5] hover:text-[#4338CA] hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
