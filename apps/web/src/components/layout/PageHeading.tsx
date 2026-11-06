import type { ReactNode } from "react";

type PageHeadingProps = {
  readonly children: ReactNode;
};

/** The single `h1` of an app page, on the approved H1 step. */
export function PageHeading({ children }: PageHeadingProps) {
  return <h1 className="text-h1 font-semibold text-text">{children}</h1>;
}
