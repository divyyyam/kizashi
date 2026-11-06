"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Registered once for the whole app; every motion module imports from here.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, ScrambleTextPlugin);

/** Motion runs only for users who have not asked to reduce it (UI-guide §6). */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
/** Pointer-driven effects (magnetic buttons, parallax) only with a fine pointer and room. */
export const FINE_POINTER =
  "(prefers-reduced-motion: no-preference) and (pointer: fine) and (min-width: 1024px)";

export const EASE_OUT = "expo.out";
export const EASE_SOFT = "power3.out";
/** Wide screens with room for scrubbed, scroll-linked scenes. */
export const ROOMY = "(prefers-reduced-motion: no-preference) and (min-width: 900px)";
/** Glyphs the scramble effect cycles through: digits, capitals and the 兆 mark. */
export const SCRAMBLE_CHARS = "0123456789ABCDEFKZ兆";

export { DrawSVGPlugin, gsap, ScrollTrigger, SplitText, useGSAP };
