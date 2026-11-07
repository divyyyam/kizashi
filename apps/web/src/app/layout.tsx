import type { Metadata } from "next";
import { type ReactNode, ViewTransition } from "react";
import { copy } from "@/content/copy";
import { MotionFlag } from "@/lib/motion/MotionFlag";
import { fontClasses } from "@/styles/fonts";
import { QueryProvider } from "./query-provider";
import "@/styles/globals.css";
import "@/components/motion/motion.css";

export const metadata: Metadata = {
  title: { default: copy.site.name, template: `%s · ${copy.site.name}` },
  description: copy.landing.hero.subtitle,
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" className={fontClasses} suppressHydrationWarning>
      <head>
        <MotionFlag />
      </head>
      <body>
        <QueryProvider>
          <ViewTransition default="none">{children}</ViewTransition>
        </QueryProvider>
      </body>
    </html>
  );
}
