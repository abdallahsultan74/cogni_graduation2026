"use client";

import { useState, type FormEvent } from "react";

import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RoleLoginFormProps = {
  title: string;
  description: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  icon: LucideIcon;
  accentClassName: string;
  buttonClassName: string;
  onSubmit?: (values: {
    identifier: string;
    password: string;
  }) => Promise<unknown>;
  isLoading?: boolean;
  error?: string | null;
  successMessage?: string | null;
};

export default function RoleLoginForm({
  title,
  description,
  identifierLabel,
  identifierPlaceholder,
  icon: Icon,
  accentClassName,
  buttonClassName,
  onSubmit,
  isLoading = false,
  error,
  successMessage,
}: RoleLoginFormProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onSubmit) {
      return;
    }

    await onSubmit({ identifier, password });
  };

  return (
    <section className="flex w-full max-w-[500px] flex-col items-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${accentClassName}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </span>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1.5 text-base text-slate-500">{description}</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2.5">
            <Label htmlFor="identifier">{identifierLabel}</Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={identifierPlaceholder}
              required
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-1 text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-slate-700 transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to roles
            </Link>

            <Button
              type="button"
              variant="ghost"
              className="h-auto p-0 text-slate-700 hover:bg-transparent hover:text-slate-950"
            >
              Forgot Password?
            </Button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className={`h-12 w-full rounded-xl bg-gradient-to-r ${buttonClassName} text-sm font-medium text-white shadow-sm transition hover:opacity-95`}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </div>
    </section>
  );
}
