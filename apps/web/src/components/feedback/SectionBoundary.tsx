"use client";

import { catchError, type ErrorInfo } from "next/error";
import { copy } from "@/content/copy";
import { StatePanel } from "./StatePanel";

function SectionFailure({ title }: { title: string }, { retry }: ErrorInfo) {
  return (
    <StatePanel compact kind="error" title={title} message={copy.errors.generic} retry={retry} />
  );
}

export const SectionBoundary = catchError(SectionFailure);
