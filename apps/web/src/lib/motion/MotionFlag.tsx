// Before first paint: apply the saved theme, and mark <html> as motion-capable so intro elements
// stay hidden until GSAP reveals them (landing-motion.css `html.motion [data-intro]`, with a CSS
// failsafe). `curtain-play` shows the once-per-session intro curtain on the landing page.
const SCRIPT =
  "var d=document.documentElement;try{if(localStorage.getItem('kizashi-theme')==='light')d.dataset.theme='light'}catch(e){}" +
  "if(matchMedia('(prefers-reduced-motion: no-preference)').matches){d.classList.add('motion');" +
  "try{if(!sessionStorage.getItem('kizashi-curtain'))d.classList.add('curtain-play')}catch(e){}}";

export function MotionFlag() {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: a constant one-line script, no user input.
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
