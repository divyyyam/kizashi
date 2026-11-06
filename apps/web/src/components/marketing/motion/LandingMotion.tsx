"use client";

import { usePathname } from "next/navigation";
import { useRef } from "react";
import { FINE_POINTER, gsap, MOTION_OK, ROOMY, useGSAP } from "@/lib/motion/gsap";
import { chapterReveals } from "./chapter-reveals";
import { footerMotion, headerMotion } from "./chrome-motion";
import { CURTAIN_HANDOFF_SEC, curtainPending, playCurtain } from "./curtain";
import { heroIntro } from "./hero-intro";
import { heroScroll } from "./hero-scroll";
import { pointerPlay } from "./pointer-play";
import { statementScroll } from "./statement-scroll";
import { velocityScenes } from "./velocity";

/**
 * Every marketing-page animation, rebuilt on each route. Pages stay server-rendered and readable;
 * this only finds their parts by class. Reduced motion skips it all and nothing is hidden.
 */
export function LandingMotion() {
  const pathname = usePathname();
  const anchor = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      const root = anchor.current?.closest<HTMLElement>(".marketing-shell");
      if (root === null || root === undefined) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const curtain = curtainPending(root);
        if (curtain) playCurtain(root);
        heroIntro(root, curtain ? CURTAIN_HANDOFF_SEC : 0);
        chapterReveals(root);
        statementScroll(root);
        velocityScenes(root);
        headerMotion(root);
        return footerMotion(root);
      });
      mm.add(ROOMY, () => heroScroll(root));
      mm.add(FINE_POINTER, () => pointerPlay(root));
      return () => mm.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );
  return <span ref={anchor} hidden />;
}
