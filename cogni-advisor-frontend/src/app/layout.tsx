import type { Metadata } from "next";
import localFont from "next/font/local";
import SharedProviders from "@/components/providers/shared";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Cogni Advisor",
  description: "Cogni Advisor is a platform for financial advisors to manage their students and their progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SharedProviders>
          {children}
          <Toaster />
        </SharedProviders>
      </body>
    </html>
  );
}
