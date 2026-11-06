import { voiceErrorSchema, voiceResponseSchema } from "@kizashi/schemas/engine";
import { voiceCopy } from "@/content/model-voice-copy";

const TRANSCRIPTION_TIMEOUT_MS = 55_000;
const ERRORS = {
  unavailable: voiceCopy.unavailable,
  invalid_audio: voiceCopy.failed,
  too_large: voiceCopy.tooLarge,
  rate_limited: voiceCopy.rateLimited,
  failed: voiceCopy.failed,
};

export async function transcribeVoice(audio: Blob, signal: AbortSignal) {
  const form = new FormData();
  form.set("audio", audio, "recording");
  const response = await fetch("/api/model/transcribe", {
    method: "POST",
    body: form,
    signal: AbortSignal.any([signal, AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS)]),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = voiceErrorSchema.safeParse(body);
    throw new Error(error.success ? ERRORS[error.data.code] : voiceCopy.failed);
  }
  const { text } = voiceResponseSchema.parse(body);
  if (!text.trim()) throw new Error(voiceCopy.empty);
  return text.trim();
}

export function appendTranscript(prompt: string, transcript: string) {
  return [prompt.trimEnd(), transcript.trim()].filter(Boolean).join("\n\n");
}
