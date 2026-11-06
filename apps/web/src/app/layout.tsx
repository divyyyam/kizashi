import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { cookieToInitialState } from "wagmi";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { PageShell } from "@/components/layout/PageShell";
import { copy } from "@/content/copy";
import { createWagmiConfig } from "@/lib/wagmi";
import { Providers } from "./providers";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: copy.site.name,
  icons: { icon: "/favicon.svg" },
};

type RootLayoutProps = {
  readonly children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  // Wallet state from the cookie so the first server render matches the client (no flicker).
  const initialState = cookieToInitialState(createWagmiConfig(), (await headers()).get("cookie"));
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <MotionConfig reducedMotion="user">
          <LazyMotion features={domAnimation}>
            <Providers initialState={initialState}>
              <PageShell header={<Navbar />} footer={<Footer />}>
                {children}
              </PageShell>
            </Providers>
            <Toaster
              theme="dark"
              toastOptions={{
                className: "border border-border bg-surface-raised text-text font-sans",
              }}
            />
          </LazyMotion>
        </MotionConfig>
      </body>
    </html>
  );
}
