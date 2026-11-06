import { type ReactNode, useId } from "react";

export const inputClass =
  "min-h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-text transition-colors duration-120 hover:border-border-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal";

/** Label + control + help + error, with the ids wired for screen readers. */
export function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string | undefined;
  error?: string | undefined;
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <div className="flex flex-col gap-2 text-small">
      <label htmlFor={id} className="text-text-muted">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {help && !error ? (
        <p id={`${id}-help`} className="text-text-faint">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
