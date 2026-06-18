"use client";

import { useMutation } from "@tanstack/react-query";

import { loginStudentAction } from "@/lib/actions/auth.action";
import type { LoginValues } from "@/lib/schemes/auth.shcema";

export default function useLogin() {
  const { error, isPending, mutate } = useMutation({
    mutationFn: async (values: LoginValues) => {
      const response = await loginStudentAction(values);
      return response;
    },
  });

  return { error, isPending, login: mutate };
}
