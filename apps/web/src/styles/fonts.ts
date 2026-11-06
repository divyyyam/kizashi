import localFont from "next/font/local";

const display = localFont({
  src: [
    { path: "./fonts/instrument-serif.woff2", style: "normal" },
    { path: "./fonts/instrument-serif-italic.woff2", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const sans = localFont({
  src: "./fonts/inter-tight.woff2",
  weight: "100 900",
  variable: "--font-inter-tight",
  display: "swap",
});
const mono = localFont({
  src: "./fonts/jetbrains-mono.woff2",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});
const mark = localFont({
  src: "./fonts/noto-serif-mark.ttf",
  weight: "500",
  variable: "--font-mark",
  display: "swap",
  adjustFontFallback: false,
});
export const fontClasses = [display.variable, sans.variable, mono.variable, mark.variable].join(
  " ",
);
