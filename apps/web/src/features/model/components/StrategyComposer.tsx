import { MAX_PROMPT_CHARACTERS } from "@kizashi/schemas/engine";
import { ArrowUpRight, FileText, Paperclip, X } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { workspaceCopy as text } from "@/content/model-workspace-copy";
import { ConnectButton } from "@/features/wallet";
import type { EngineSession } from "../hooks/use-engine-session";
import { validateRulesFile } from "../lib/validate-rules-file";
import { VoiceInput } from "./VoiceInput";

export function StrategyComposer({ session }: { session: EngineSession }) {
  const id = useId();
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [validating, setValidating] = useState(false);
  const disabled = session.state.busy || Boolean(session.runId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file || disabled || voiceBusy || validating) return;
    setValidating(true);
    try {
      const problem = await validateRulesFile(file);
      setError(problem);
      if (!problem) await session.create(file, prompt);
    } finally {
      setValidating(false);
    }
  }
  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="model-strategy flex min-w-0 flex-col gap-6 rounded-lg border border-border bg-surface p-5 md:p-6"
    >
      <header className="flex flex-col gap-2">
        <h2 className="text-h3 text-text">{text.strategy}</h2>
        <p className="text-small text-text-muted">{text.strategyHelp}</p>
      </header>
      <div className="flex flex-col gap-3">
        <label htmlFor={id} className="text-small text-text">
          {text.prompt}
        </label>
        <textarea
          id={id}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          maxLength={MAX_PROMPT_CHARACTERS}
          disabled={disabled}
          placeholder={text.promptHint}
          className="model-prompt min-h-36 w-full resize-y rounded-md border border-border bg-bg p-4 text-body text-text placeholder:text-text-faint focus-visible:border-signal focus-visible:outline-none disabled:opacity-60"
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <span className="self-end font-mono text-label text-text-faint">
          {text.characters(prompt.length)}
        </span>
        <VoiceInput
          prompt={prompt}
          onInsert={setPrompt}
          onBusy={setVoiceBusy}
          disabled={disabled}
        />
      </div>
      <RuleAttachment
        id={`${id}-rules`}
        file={file}
        disabled={disabled}
        onFile={(value) => {
          setFile(value);
          setError(null);
        }}
      />
      <div className="grid gap-2 border-t border-border pt-4 text-small">
        <div className="flex items-center justify-between gap-4">
          <span className="text-text">{text.suggest}</span>
          <span className="text-text-muted">{text.suggestHelp}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-text-faint">{text.auto}</span>
          <span className="text-text-faint">{text.autoHelp}</span>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-small text-warning">
          {error}
        </p>
      ) : null}
      {!session.identity.address ? (
        <ConnectButton />
      ) : (
        <Button
          type="submit"
          disabled={
            disabled ||
            validating ||
            voiceBusy ||
            !file ||
            !session.identity.ready ||
            !prompt.trim()
          }
          className="w-full"
        >
          {session.state.busy || validating ? text.busy : text.start}
          <ArrowUpRight aria-hidden className="size-4" />
        </Button>
      )}
      {!file ? <p className="text-small text-text-faint">{text.rulesRequired}</p> : null}
      {session.identity.address && !session.identity.ready ? (
        <p role="status" className="text-small text-warning">
          {text.wrongChain}
        </p>
      ) : null}
    </form>
  );
}

function RuleAttachment({
  id,
  file,
  disabled,
  onFile,
}: {
  id: string;
  file: File | null;
  disabled: boolean;
  onFile: (file: File | null) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-small text-text">{text.rules}</h3>
      <p className="text-small text-text-muted">{text.rulesHelp}</p>
      <div className="flex items-center gap-3 rounded-md border border-dashed border-border-strong bg-bg p-3">
        {file ? (
          <>
            <FileText aria-hidden className="size-5 shrink-0 text-signal" />
            <span className="min-w-0 flex-1 break-all text-small text-text">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label={text.removeRules}
              onClick={() => onFile(null)}
            >
              <X aria-hidden className="size-4" />
            </Button>
          </>
        ) : (
          <label
            htmlFor={id}
            className="flex min-h-10 w-full cursor-pointer items-center gap-3 text-small text-text has-focus-visible:outline-1 has-focus-visible:outline-signal"
          >
            <Paperclip aria-hidden className="size-4" />
            {text.attachRules}
            <input
              id={id}
              disabled={disabled}
              type="file"
              accept=".json,.pdf,application/json,application/pdf"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>
    </section>
  );
}
