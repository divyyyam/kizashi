"use client";

import { voiceAvailabilitySchema } from "@kizashi/schemas/engine";
import { useEffect, useRef, useState } from "react";
import { voiceCopy } from "@/content/model-voice-copy";
import { transcribeVoice } from "../lib/transcribe-voice";
import { canRecord, microphoneError, recordVoice } from "../lib/voice-recorder";

type VoiceStatus =
  | "checking"
  | "idle"
  | "requesting"
  | "recording"
  | "transcribing"
  | "review"
  | "error"
  | "unavailable";
export function useVoiceInput() {
  const [status, setStatus] = useState<VoiceStatus>("checking");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const recording = useRef<Awaited<ReturnType<typeof recordVoice>>>(null);
  useEffect(() => {
    const check = new AbortController();
    if (!canRecord()) {
      setStatus("unavailable");
      setMessage(voiceCopy.unsupported);
      return;
    }
    fetch("/api/model/transcribe", {
      signal: AbortSignal.any([check.signal, AbortSignal.timeout(10_000)]),
    })
      .then(async (response) => voiceAvailabilitySchema.parse(await response.json()))
      .then(({ available }) => {
        if (!check.signal.aborted) {
          setStatus(available ? "idle" : "unavailable");
          setMessage(voiceCopy.unavailable);
        }
      })
      .catch(() => {
        if (!check.signal.aborted) {
          setStatus("unavailable");
          setMessage(voiceCopy.unavailable);
        }
      });
    return () => {
      check.abort();
      controller.current?.abort();
    };
  }, []);
  async function start() {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setStatus("requesting");
    setSeconds(0);
    setMessage("");
    const fail = (reason: string) => {
      if (!active.signal.aborted) {
        setStatus("error");
        setMessage(reason);
      }
    };
    try {
      const capture = await recordVoice({
        signal: active.signal,
        onTime: setSeconds,
        onError: fail,
        onComplete: (audio) => {
          setStatus("transcribing");
          transcribeVoice(audio, active.signal)
            .then((text) => {
              if (!active.signal.aborted) {
                setTranscript(text);
                setStatus("review");
              }
            })
            .catch((error: unknown) =>
              fail(error instanceof Error ? error.message : voiceCopy.failed),
            );
        },
      });
      if (capture && !active.signal.aborted) {
        recording.current = capture;
        setStatus("recording");
      }
    } catch (error) {
      fail(microphoneError(error));
    }
  }
  function cancel() {
    controller.current?.abort();
    recording.current = null;
    setTranscript("");
    setMessage("");
    setStatus("idle");
  }
  return {
    status,
    message,
    transcript,
    setTranscript,
    seconds,
    start,
    cancel,
    stop: () => recording.current?.stop(),
  };
}
