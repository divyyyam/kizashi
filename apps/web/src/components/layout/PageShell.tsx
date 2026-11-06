import type { ReactNode } from "react";

type PageShellProps = {
  readonly header?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
};

/**
 * Full-height page frame. `header` and `footer` receive the Navbar (UI-02) and Footer (UI-03);
 * until they exist nothing renders in those slots. `min-h-dvh` keeps mobile browser chrome from
 * clipping content.
 */
export function PageShell({ header, footer, children }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      {header}
      <main className="flex flex-1 flex-col">{children}</main>
      {footer}
    </div>
  );
}
