"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "rounded-xl border bg-white text-slate-900 shadow-lg",
          success: "!border-sky-200 !bg-sky-50 !text-slate-900",
          error: "!border-red-200 !bg-red-50 !text-red-700",
          title: "text-sm font-medium",
          description: "text-sm text-slate-600",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
