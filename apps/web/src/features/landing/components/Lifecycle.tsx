import { copy } from "@/content/copy";
import { Section } from "./Section";
import { SectionHeading } from "./SectionHeading";

const text = copy.landing.lifecycle;

/** Create, trade, resolve, redeem: an ordered list, so the numbers carry the sequence. */
export function Lifecycle() {
  return (
    <Section labelledBy="lifecycle-title">
      <SectionHeading
        id="lifecycle-title"
        eyebrow={text.eyebrow}
        lead={text.titleLead}
        accent={text.titleAccent}
      />
      <div className="flex flex-col gap-0">
        <div aria-hidden className="relative h-px bg-border">
          <div data-scrub="rail" className="absolute inset-0 bg-signal" />
        </div>
        <ol data-stagger className="grid sm:grid-cols-2 lg:grid-cols-4">
          {text.steps.map((item, i) => (
            <li
              key={item.title}
              className="flex flex-col gap-10 border-border py-8 sm:pr-8 max-lg:border-b lg:border-r lg:pl-8 lg:first:pl-0 lg:last:border-r-0"
            >
              <span className="flex items-center gap-3 font-mono text-label text-text-faint">
                <span aria-hidden className="size-2 rounded-full border border-signal bg-bg" />
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="text-h1 text-text">{item.title}</h3>
                <p className="max-w-xs text-small text-text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
