import { type ReactNode, ViewTransition } from "react";

export default function MarketingTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="ink-page" exit="ink-page" default="none">
      <div className="marketing-page">{children}</div>
    </ViewTransition>
  );
}
