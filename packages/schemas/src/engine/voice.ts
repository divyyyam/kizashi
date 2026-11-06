import { z } from "zod";

export const MAX_VOICE_BYTES = 8 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 120;
export const MAX_PROMPT_CHARACTERS = 2000;
export const voiceMimeSchema = z.enum(["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"]);
export const voiceAvailabilitySchema = z.object({ available: z.boolean() }).strict();
export const voiceResponseSchema = z.object({ text: z.string().max(16000) }).strict();
export const voiceErrorSchema = z.object({
  code: z.enum(["unavailable", "invalid_audio", "too_large", "rate_limited", "failed"]),
}).strict();
