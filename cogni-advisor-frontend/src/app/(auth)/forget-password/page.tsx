"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmPasswordResetAction,
  requestPasswordResetAction,
} from "@/lib/actions/auth.action";

type Step = "request" | "confirm" | "done";

export default function ForgetPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [nationalId, setNationalId] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string>();
  const [pending, startTransition] = useTransition();

  const requestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await requestPasswordResetAction(nationalId.trim());
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setMaskedEmail(result.maskedEmail);
      setStep("confirm");
      if (result.maskedEmail) {
        toast.success(`Code sent to ${result.maskedEmail}`);
      } else {
        toast.success(result.message);
      }
      if (result.devHint) {
        toast.info(result.devHint);
      }
    });
  };

  const resetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    startTransition(async () => {
      const result = await confirmPasswordResetAction(nationalId.trim(), otp.trim(), password);
      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      setStep("done");
      toast.success("Password updated");
    });
  };

  return (
    <section className="flex w-full max-w-[520px] flex-col items-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot password</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === "request"
              ? "Enter your 14-digit national ID. We will send a 6-digit code to your personal email on file."
              : step === "confirm"
                ? maskedEmail
                  ? `Enter the code sent to ${maskedEmail} and choose a new password.`
                  : "Enter the verification code and choose a new password."
                : "Your password has been updated."}
          </p>
        </header>

        {step === "done" ? (
          <div className="space-y-4 text-center text-sm text-slate-600">
            <p>You can now sign in with your new password.</p>
            <Link href="/login" className="font-semibold text-slate-900 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : step === "confirm" ? (
          <form className="space-y-5" onSubmit={resetPassword}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Verification code</label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                inputMode="numeric"
                pattern="\d{6}"
                minLength={6}
                maxLength={6}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl">
              {pending ? "Updating..." : "Reset password"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                onClick={() => setStep("request")}
              >
                Use a different national ID
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={requestOtp}>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">National ID</label>
              <Input
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="29901150100001"
                inputMode="numeric"
                minLength={14}
                maxLength={14}
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="h-12 w-full rounded-xl">
              {pending ? "Sending..." : "Send verification code"}
            </Button>
            <div className="text-center">
              <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-slate-900">
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
