"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TTSItem = { messageId: string; text: string; voiceId?: string };

type Controls = {
  enabled: boolean;
  autoplay: boolean;
  lastError: string | null;
  setEnabled: (enabled: boolean) => void;
  setAutoplay: (autoplay: boolean) => void;
  clearError: () => void;
};

export type UseTTS = {
  prefetch: (item: TTSItem) => Promise<void>;
  enqueue: (item: TTSItem) => void;
  speakNow: (item: TTSItem) => Promise<void>;
  stop: () => void;
  controls: Controls;
  nowPlayingMessageId: string | null;
  debugInfo: () => string;
};

function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "TTS failed";
}

function normalizeSpokenText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s"""''']+|[\s"""''']+$/g, "")
    .trim();
}

function isFillerUtterance(text: string): boolean {
  const t = normalizeSpokenText(text).toLowerCase();
  return (
    t === "uhm" ||
    t === "um" ||
    t === "uh" ||
    t === "erm" ||
    t === "hmm" ||
    t === "huh" ||
    /^[.?!…]+$/.test(t)
  );
}

function isSpeakableText(text: string): boolean {
  const t = normalizeSpokenText(text);
  if (t.length < 6) return false;
  if (isFillerUtterance(t)) return false;
  const wordCount = t.split(" ").filter(Boolean).length;
  if (wordCount < 2) return false;
  return true;
}

function makeKey(voiceId: string | undefined, text: string): string {
  return `${voiceId ?? ""}\n${text}`;
}

export function useTTS(): UseTTS {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const inflightByKeyRef = useRef(new Map<string, Promise<AudioBuffer>>());
  const audioByKeyRef = useRef(new Map<string, AudioBuffer>());
  const audioByMessageIdRef = useRef(new Map<string, AudioBuffer>());
  const queueRef = useRef<TTSItem[]>([]);

  // Drain loop guard — true while loop is running
  const drainLoopActiveRef = useRef(false);

  // Ref mirrors of state so the drain loop reads current values without stale closures
  const enabledRef = useRef(true);
  const autoplayRef = useRef(true);

  // Stable setters stored in refs so the drain loop can call them
  const setErrorRef = useRef<(msg: string | null) => void>(() => {});
  const setNowPlayingRef = useRef<(id: string | null) => void>(() => {});

  const [enabled, setEnabledState] = useState(true);
  const [autoplay, setAutoplayState] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [nowPlayingMessageId, setNowPlayingMessageId] = useState<string | null>(null);

  // Keep ref mirrors in sync
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);

  // Store stable setters in refs once on mount
  useEffect(() => {
    setErrorRef.current = setLastError;
    setNowPlayingRef.current = setNowPlayingMessageId;
  }, []);

  const setEnabled = useCallback((v: boolean) => setEnabledState(v), []);
  const setAutoplay = useCallback((v: boolean) => setAutoplayState(v), []);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // ── stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    try { activeSourceRef.current?.stop(); } catch { /* ignore */ }
    activeSourceRef.current = null;
    drainLoopActiveRef.current = false;
    queueRef.current = [];
    setNowPlayingMessageId(null);
  }, []);

  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);

  // ── fetchAndDecode ────────────────────────────────────────────────────────
  const fetchAndDecode = useCallback(
    async (item: TTSItem): Promise<AudioBuffer> => {
      const key = makeKey(item.voiceId, item.text);

      const cached = audioByKeyRef.current.get(key);
      if (cached) return cached;

      const inflight = inflightByKeyRef.current.get(key);
      if (inflight) return inflight;

      const promise = (async () => {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: item.text, voiceId: item.voiceId }),
        });

        if (!res.ok) {
          const ct = res.headers.get("Content-Type") ?? "";
          if (ct.includes("application/json")) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error || "TTS request failed");
          }
          throw new Error(`TTS request failed (${res.status})`);
        }

        const arrayBuffer = await res.arrayBuffer();
        const audioContext = ensureAudioContext();
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(() => {});
        }
        const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        audioByKeyRef.current.set(key, decoded);
        return decoded;
      })();

      inflightByKeyRef.current.set(key, promise);
      try {
        return await promise;
      } finally {
        inflightByKeyRef.current.delete(key);
      }
    },
    [ensureAudioContext]
  );

  // ── playBuffer ────────────────────────────────────────────────────────────
  const playBuffer = useCallback(
    async (messageId: string, buffer: AudioBuffer): Promise<void> => {
      const audioContext = ensureAudioContext();
      if (audioContext.state === "suspended") {
        try { await audioContext.resume(); } catch {
          throw new Error("Audio blocked — click anywhere on the page first to allow audio.");
        }
      }

      try { activeSourceRef.current?.stop(); } catch { /* ignore */ }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      activeSourceRef.current = source;
      setNowPlayingRef.current(messageId);
      console.log("[TTS] ▶ playing", messageId);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });

      if (activeSourceRef.current === source) activeSourceRef.current = null;
      setNowPlayingRef.current(null);
      console.log("[TTS] ✓ done playing", messageId);
    },
    [ensureAudioContext]
  );

  // ── drain loop ref ────────────────────────────────────────────────────────
  // Stored in a ref so enqueue can call it without a stale closure.
  // Re-assigned via useEffect when its dependencies change, but the ref
  // itself is stable — enqueue always calls drainFnRef.current().
  const drainFnRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    drainFnRef.current = async function drainLoop() {
      if (drainLoopActiveRef.current) {
        console.log("[TTS] drain already active — queue:", queueRef.current.length);
        return;
      }
      if (!enabledRef.current) {
        console.log("[TTS] drain skipped — disabled");
        return;
      }

      drainLoopActiveRef.current = true;
      console.log("[TTS] drain START queue:", queueRef.current.length);

      try {
        while (queueRef.current.length > 0) {
          if (!drainLoopActiveRef.current || !enabledRef.current) {
            console.log("[TTS] drain interrupted");
            break;
          }

          const next = queueRef.current.shift()!;
          console.log("[TTS] drain processing", next.messageId, "remaining:", queueRef.current.length);

          // Look-ahead: start fetching next item while we play current
          const afterNext = queueRef.current[0];
          if (afterNext) {
            void fetchAndDecode(afterNext)
              .then((buf) => { audioByMessageIdRef.current.set(afterNext.messageId, buf); })
              .catch(() => {});
          }

          try {
            const buffer =
              audioByMessageIdRef.current.get(next.messageId) ??
              (await fetchAndDecode(next));
            audioByMessageIdRef.current.set(next.messageId, buffer);

            if (!drainLoopActiveRef.current || !enabledRef.current) break;

            await playBuffer(next.messageId, buffer);
          } catch (err) {
            console.error("[TTS] error playing", next.messageId, safeErrorMessage(err));
            setErrorRef.current(safeErrorMessage(err));
            // Continue to next item
          }
        }
      } finally {
        drainLoopActiveRef.current = false;
        console.log("[TTS] drain END queue:", queueRef.current.length);
      }
    };
  }, [fetchAndDecode, playBuffer]); // both are stable memoized callbacks

  // ── prefetch ──────────────────────────────────────────────────────────────
  const prefetch = useCallback(
    async (item: TTSItem) => {
      if (!item.messageId || !item.text?.trim()) return;
      if (!isSpeakableText(item.text)) return;
      if (audioByMessageIdRef.current.has(item.messageId)) return;
      console.log("[TTS] prefetch", item.messageId);
      try {
        const buffer = await fetchAndDecode(item);
        audioByMessageIdRef.current.set(item.messageId, buffer);
        console.log("[TTS] prefetch done", item.messageId);
      } catch (err) {
        console.warn("[TTS] prefetch failed", item.messageId, err);
        // Don't surface prefetch errors to the user — they'll surface on play
      }
    },
    [fetchAndDecode]
  );

  // ── enqueue ───────────────────────────────────────────────────────────────
  // Intentionally has NO dependencies — reads everything via refs.
  // This means it never becomes "stale" from React's perspective.
  const enqueue = useCallback((item: TTSItem) => {
    if (!item.messageId || !item.text?.trim()) return;
    if (!enabledRef.current) {
      console.log("[TTS] enqueue skipped — disabled");
      return;
    }
    if (!isSpeakableText(item.text)) {
      console.log("[TTS] enqueue skipped — not speakable", item.messageId);
      return;
    }
    queueRef.current.push(item);
    console.log("[TTS] enqueued", item.messageId, "| queue:", queueRef.current.length, "| autoplay:", autoplayRef.current, "| drain active:", drainLoopActiveRef.current);
    if (autoplayRef.current) {
      void drainFnRef.current();
    }
  }, []); // no deps — all reads via refs

  // ── speakNow ──────────────────────────────────────────────────────────────
  const speakNow = useCallback(
    async (item: TTSItem) => {
      if (!item.messageId || !item.text?.trim()) return;
      if (!enabledRef.current) return;
      if (!isSpeakableText(item.text)) {
        setLastError("Nothing meaningful to speak yet.");
        return;
      }

      // Stop drain loop and queue
      drainLoopActiveRef.current = false;
      queueRef.current = [];
      setLastError(null);
      try { activeSourceRef.current?.stop(); } catch { /* ignore */ }

      try {
        const buffer =
          audioByMessageIdRef.current.get(item.messageId) ??
          (await fetchAndDecode(item));
        audioByMessageIdRef.current.set(item.messageId, buffer);
        await playBuffer(item.messageId, buffer);
      } catch (err) {
        setLastError(safeErrorMessage(err));
      }
    },
    [fetchAndDecode, playBuffer]
  );

  // ── debug ─────────────────────────────────────────────────────────────────
  const debugInfo = useCallback(() => {
    return JSON.stringify({
      queueLength: queueRef.current.length,
      drainActive: drainLoopActiveRef.current,
      enabled: enabledRef.current,
      autoplay: autoplayRef.current,
      cachedBuffers: audioByMessageIdRef.current.size,
      audioContextState: audioContextRef.current?.state ?? "none",
    }, null, 2);
  }, []);

  const controls: Controls = useMemo(
    () => ({
      enabled,
      autoplay,
      lastError,
      setEnabled,
      setAutoplay,
      clearError: () => setLastError(null),
    }),
    [autoplay, enabled, lastError, setEnabled, setAutoplay]
  );

  return { prefetch, enqueue, speakNow, stop, controls, nowPlayingMessageId, debugInfo };
}
