"use client";

import dynamic from "next/dynamic";
import ReactQueryProvider from "./_components/react-query.provider";
import NextAuthProvider from "./_components/next-auth.provider";

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then((mod) => mod.ReactQueryDevtools),
  { ssr: false }
);

export default function SharedProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools /> : null}
      <NextAuthProvider>{children}</NextAuthProvider>
    </ReactQueryProvider>
  );
}