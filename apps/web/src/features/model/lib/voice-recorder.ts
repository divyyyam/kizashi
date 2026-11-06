import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from "@kizashi/schemas/engine";
import { voiceCopy } from "@/content/model-voice-copy";

const MIME_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];
const CHUNK_MS = 250;

export function canRecord() {
  return (
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

export function microphoneError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError")
    return voiceCopy.permission;
  if (error instanceof DOMException && error.name === "NotFoundError") return voiceCopy.missing;
  return voiceCopy.failed;
}

export async function recordVoice(options: {
  signal: AbortSignal;
  onTime: (seconds: number) => void;
  onComplete: (audio: Blob) => void;
  onError: (message: string) => void;
}) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const release = () => {
    for (const track of stream.getTracks()) track.stop();
  };
  if (options.signal.aborted) {
    release();
    return null;
  }
  const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) {
    release();
    throw new Error(voiceCopy.unsupported);
  }
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType });
  } catch (error) {
    release();
    throw error;
  }
  return startRecorder(recorder, { ...options, release });
}

function startRecorder(
  recorder: MediaRecorder,
  options: Parameters<typeof recordVoice>[0] & { release: () => void },
) {
  const chunks: Blob[] = [];
  let bytes = 0;
  let failed = false;
  const startedAt = Date.now();
  const stop = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  const cancel = () => {
    failed = true;
    stop();
    options.release();
  };
  const timer = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    options.onTime(seconds);
    if (seconds >= MAX_VOICE_SECONDS) stop();
  }, CHUNK_MS);
  recorder.ondataavailable = ({ data }) => {
    bytes += data.size;
    if (bytes > MAX_VOICE_BYTES) {
      failed = true;
      stop();
      options.onError(voiceCopy.tooLarge);
    } else if (!failed) chunks.push(data);
  };
  recorder.onerror = () => {
    failed = true;
    stop();
    options.release();
    options.onError(voiceCopy.failed);
  };
  recorder.onstop = () => {
    clearInterval(timer);
    options.release();
    options.signal.removeEventListener("abort", cancel);
    if (!failed && !options.signal.aborted)
      options.onComplete(new Blob(chunks, { type: recorder.mimeType }));
  };
  options.signal.addEventListener("abort", cancel, { once: true });
  try {
    recorder.start(CHUNK_MS);
  } catch (error) {
    clearInterval(timer);
    options.release();
    options.signal.removeEventListener("abort", cancel);
    throw error;
  }
  return { stop };
}
