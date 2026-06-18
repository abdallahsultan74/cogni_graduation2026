"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, GraduationCap, Loader2, MoveRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  loginSchema,
  type LoginValues,
} from "@/lib/schemes/auth.shcema";
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
import { useState } from "react";

import useLogin from "../_hooks/use-login";

export default function StudentLoginForm() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const { login, isPending } = useLogin();

  const onSubmit = (values: LoginValues) => {
    login(values, {
      onSuccess: (data) => {
        setIsRedirecting(true);
        const fullName =
          typeof data === "object" &&
          data !== null &&
          "user" in data &&
          typeof data.user === "object" &&
          data.user !== null &&
          "first_name" in data.user &&
          "last_name" in data.user
            ? `${String(data.user.first_name)} ${String(data.user.last_name)}`.trim()
            : "Student";

        toast.success(`Welcome Back ${fullName}`);
        setTimeout(() => router.push("/"), 1200);
      },
      onError: (error) => {
        setIsRedirecting(false);
        toast.error(error.message);
      },
    });
  };

  return (
    <section className="flex w-full max-w-[500px] flex-col items-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600">
            <GraduationCap className="h-5 w-5" strokeWidth={1.8} />
          </span>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Student Portal Login
            </h1>
            <p className="mt-1.5 text-base text-slate-500">
              Sign in to access your account
            </p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>National ID</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="29201019999999"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="TestPass123"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              variant="gradient"
              size="lg"
              disabled={isPending || isRedirecting}
              className="flex h-12 w-full items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex items-center gap-2">
                {isPending || isRedirecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRedirecting ? "Redirecting..." : "Signing In..."}
                  </>
                ) : (
                  <>
                    Sign In
                    <MoveRight className="h-4 w-4" />
                  </>
                )}
              </span>
            </Button>
          </form>
        </Form>
      </div>
    </section>
  );
}
