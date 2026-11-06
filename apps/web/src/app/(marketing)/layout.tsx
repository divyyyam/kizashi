import { MarketingMotion } from "@/components/marketing/MarketingMotion";
import { Cursor } from "@/components/marketing/motion/Cursor";
import { LandingMotion } from "@/components/marketing/motion/LandingMotion";
import "@/components/marketing/marketing.css";
import "@/components/marketing/story/story.css";
import "@/components/marketing/motion/landing-motion.css";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site/SiteFooter";
import { SiteHeader } from "@/components/layout/site/SiteHeader";

type MarketingLayoutProps = {
  readonly children: ReactNode;
};

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="marketing-shell flex min-h-dvh flex-col">
      <MarketingMotion />
      <LandingMotion />
      <Cursor />
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
