"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useLogin from "./_hooks/use-login-mutation";
import { loginSchema, type LoginValues } from "./_schema/login.schema";

export default function LoginPage() {
  const { isPending, error, login } = useLogin();
  const form = useForm<LoginValues>({
    defaultValues: {
      email: "",
      password: "",
      role: "student",
    },
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
  });

  const onSubmit: SubmitHandler<LoginValues> = (values) => {
    login(values);
  };

  useEffect(() => {
    if (!error) {
      return;
    }

    const message =
      error instanceof Error ? error.message : "Login failed. Please try again.";
    toast.error(message);
  }, [error]);

  return (
    <section className="flex w-full max-w-[520px] flex-col items-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Sign in to Cogni Advisor
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Use your account credentials and choose your role.
          </p>
        </header>

        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              name="email"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>University Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="name@student.eelu.edu.eg"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="role"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-3 gap-3">
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={field.value === "student"}
                          onChange={() => field.onChange("student")}
                          className="h-4 w-4 accent-sky-600"
                        />
                        Student
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={field.value === "advisor"}
                          onChange={() => field.onChange("advisor")}
                          className="h-4 w-4 accent-sky-600"
                        />
                        Advisor
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={field.value === "admin"}
                          onChange={() => field.onChange("admin")}
                          className="h-4 w-4 accent-sky-600"
                        />
                        Admin
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Link
                href="/forget-password"
                className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
              >
                Forgot password?
              </Link>
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Unable to sign in</p>
                  <p className="mt-0.5 text-red-600">
                    {error instanceof Error
                      ? error.message
                      : "Login failed. Please try again."}
                  </p>
                </div>
              </div>
            ) : null}

            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={isPending}
              className="h-12 w-full rounded-xl"
            >
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>
      </div>
    </section>
  );
}
