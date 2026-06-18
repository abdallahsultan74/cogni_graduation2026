"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getSession, signIn } from "next-auth/react";
import { toast } from "sonner";

type LoginRole = "student" | "advisor" | "admin";

type LoginPayload = {
  email: string;
  password: string;
  role: LoginRole;
};


const getDisplayNameFromEmail = (email: string) => {
  const raw = email.split("@")[0] ?? "";
  if (!raw) {
    return "User";
  }

  return raw
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getDisplayNameFromSession = async (emailFallback: string) => {
  const session = await getSession();
  const firstName = session?.user?.firstName?.trim();
  const lastName = session?.user?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  const sessionName = session?.user?.name?.trim();
  if (sessionName) {
    return sessionName;
  }

  return getDisplayNameFromEmail(emailFallback);
};

const normalizeCallbackUrl = (callbackUrl?: string | null) => {
  if (!callbackUrl || !callbackUrl.startsWith("/")) {
    return null;
  }

  if (callbackUrl === "/student") {
    return "/student/dashboard";
  }

  if (callbackUrl === "/advisor") {
    return "/advisor/dashboard";
  }

  if (callbackUrl === "/admin") {
    return "/admin/dashboard";
  }

  return callbackUrl;
};

const getDashboardByRole = (role: LoginRole): string => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "advisor":
      return "/advisor/dashboard";
    case "student":
    default:
      return "/student/dashboard";
  }
};

export default function useLogin() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { error, isError, isSuccess, isPending, mutate } = useMutation({
    mutationFn: async (values: LoginPayload) => {
      const response = await signIn("credentials", {
        ...values,
        redirect: false,
      });

      if (!response) {
        throw new Error("Login failed. Please try again.");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.ok) {
        throw new Error("Unable to sign in right now. Please try again.");
      }

      // Get callbackUrl from query params (e.g. user was redirected here from a protected page)
      const callbackUrl = normalizeCallbackUrl(
        new URLSearchParams(window.location.search).get("callbackUrl")
      );

      const displayName = await getDisplayNameFromSession(values.email);
      const successMessage =
        values.role === "advisor"
          ? `Welcome Back Eng ${displayName}`
          : `Welcome Back ${displayName}`;

      toast.success(successMessage);
      setIsRedirecting(true);

      // Use callbackUrl if the user was trying to reach a specific page,
      // otherwise navigate directly to the role's dashboard.
      // Do NOT use response.url — it points back to the login page.
      const redirectTo = callbackUrl || getDashboardByRole(values.role);
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 700);
    },
    onMutate: () => {
      setIsRedirecting(false);
    },
    onError: () => {
      setIsRedirecting(false);
    },
  });

  return {
    error,
    isError,
    isSuccess,
    isPending: isPending || isRedirecting,
    login: mutate,
  };
}
