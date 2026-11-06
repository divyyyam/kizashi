"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MarketingMotion() {
  const pathname = usePathname();
  // biome-ignore lint/correctness/useExhaustiveDependencies: remount smooth scroll on every route so it measures the new page.
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: no-preference) and (pointer:fine)");
    let version = 0,
      dispose: (() => void) | undefined;
    function sync() {
      const current = ++version;
      dispose?.();
      dispose = undefined;
      if (!media.matches) return;
      void import("./marketing-scroll").then(({ mountScroll }) => {
        if (current === version) dispose = mountScroll();
      });
    }
    sync();
    media.addEventListener("change", sync);
    return () => {
      version++;
      media.removeEventListener("change", sync);
      dispose?.();
    };
  }, [pathname]);
  return null;
}
