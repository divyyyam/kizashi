import { copy } from "@/content/copy";
import { Section } from "./Section";

const text = copy.landing.stack;

/** What each sponsor network does in Kizashi, as a ruled list rather than a logo wall. */
export function Stack() {
  return (
    <Section labelledBy="stack-title" className="gap-8">
      <h2
        id="stack-title"
        data-reveal
        className="flex items-center gap-3 text-label text-text-muted"
      >
        <span aria-hidden className="h-px w-6 bg-signal" />
        {text.eyebrow}
      </h2>
      <ul className="flex flex-col">
        {text.items.map((item) => (
          <li key={item.name} className="flex flex-col">
            <span aria-hidden data-rule className="h-px bg-border" />
            <div
              data-reveal
              className="group grid gap-2 py-8 md:grid-cols-12 md:items-baseline md:gap-8"
            >
              <span className="text-display text-text transition-transform duration-300 ease-out-soft md:col-span-5 md:group-hover:translate-x-3">
                {item.name}
              </span>
              <span className="text-body text-text-muted md:col-span-7">{item.role}</span>
            </div>
          </li>
        ))}
        <li aria-hidden data-rule className="h-px bg-border" />
      </ul>
    </Section>
  );
}
