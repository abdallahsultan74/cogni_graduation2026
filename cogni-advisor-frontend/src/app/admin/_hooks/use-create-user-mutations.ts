"use client";

import { useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import type { CreateUserValues } from "../_schema/create-user.schema";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_COGNI_API_BASE_URL ||
  process.env.COGNI_API_BASE_URL ||
  "http://localhost:5000";

const createUserRequest = async (
  endpoint: "/api/users/students" | "/api/users/advisors",
  payload: CreateUserValues,
  accessToken?: string
) => {
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : "Request failed. Please try again.";

    throw new Error(message);
  }

  return data;
};

export function useCreateStudentMutation() {
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (payload: CreateUserValues) =>
      createUserRequest(
        "/api/users/students",
        payload,
        session?.accessToken as string | undefined
      ),
  });
}

export function useCreateAdvisorMutation() {
  const { data: session } = useSession();

  return useMutation({
    mutationFn: (payload: CreateUserValues) =>
      createUserRequest(
        "/api/users/advisors",
        payload,
        session?.accessToken as string | undefined
      ),
  });
}
