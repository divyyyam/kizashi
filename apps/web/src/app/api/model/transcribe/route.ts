import { voiceAvailabilitySchema, voiceErrorSchema } from "@kizashi/schemas/engine";
import {
  readAudio,
  transcribeAudio,
  VoiceError,
  voiceConfig,
} from "@/features/model/lib/server/voice-transcription";
import { allow, clientKey } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "cache-control": "no-store" };
const WINDOW_MS = 60_000;

export function GET() {
  return Response.json(voiceAvailabilitySchema.parse({ available: voiceConfig() !== null }), {
    headers: HEADERS,
  });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json(voiceErrorSchema.parse({ code: "invalid_audio" }), {
      status: 403,
      headers: HEADERS,
    });
  }
  if (
    !allow(`voice:${clientKey(request)}`, 6, WINDOW_MS) ||
    !allow("voice:global", 60, WINDOW_MS)
  ) {
    return Response.json(voiceErrorSchema.parse({ code: "rate_limited" }), {
      status: 429,
      headers: HEADERS,
    });
  }
  try {
    if (!voiceConfig()) throw new VoiceError("unavailable", 503);
    const audio = await readAudio(request);
    return Response.json(await transcribeAudio(audio, request.signal), { headers: HEADERS });
  } catch (error) {
    return Response.json(
      voiceErrorSchema.parse({ code: error instanceof VoiceError ? error.code : "failed" }),
      {
        status: error instanceof VoiceError ? error.status : 502,
        headers: HEADERS,
      },
    );
  }
}
