import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Providers } from "@/app/providers";
import { AppShell } from "@/components/layout/app/AppShell";

type AppLayoutProps = {
  readonly children: ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <Providers>
      <AppShell>{children}</AppShell>
      <Toaster theme="system" />
    </Providers>
  );
}
