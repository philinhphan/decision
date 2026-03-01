import {
  elevenLabsVoiceIndex,
  getElevenLabsApiKey,
  getElevenLabsVoiceIds,
  pickOpenAIVoiceForIndex,
} from "@/lib/voices";

export const runtime = "nodejs";

// OpenAI voices — kept in sync with voices.ts OPENAI_VOICES
const OPENAI_VOICE_SET = new Set([
  "marin", "cedar", "alloy", "ash", "ballad", "coral",
  "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse",
]);

type CacheEntry = { bytes: ArrayBuffer; createdAt: number };

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, CacheEntry>();

function makeCacheKey(voice: string, text: string): string {
  return `${voice}\n${text}`;
}

function pruneCache() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > CACHE_TTL_MS) cache.delete(key);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
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

function audioResponse(buffer: ArrayBuffer): Response {
  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}

async function callOpenAITTS(
  text: string,
  voice: string
): Promise<{ ok: true; buffer: ArrayBuffer } | { ok: false; status: number; detail: string }> {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) {
    return { ok: false, status: 500, detail: "OPENAI_API_KEY not set" };
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status, detail: detail.slice(0, 500) };
  }

  return { ok: true, buffer: await res.arrayBuffer() };
}

async function callElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<{ ok: true; buffer: ArrayBuffer } | { ok: false; status: number; detail: string }> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
        speed: 1.15,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false, status: res.status, detail: detail.slice(0, 500) };
  }

  return { ok: true, buffer: await res.arrayBuffer() };
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, voiceId } = (payload ?? {}) as { text?: unknown; voiceId?: unknown };
  const cleanText = typeof text === "string" ? text.trim() : "";
  const cleanVoiceId = typeof voiceId === "string" ? voiceId.trim() : "";

  if (!cleanText) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }
  if (!isSpeakableText(cleanText)) {
    return Response.json({ error: "text is too short/invalid for speech" }, { status: 400 });
  }

  // Determine which provider + voice to use.
  // If voiceId is already an OpenAI voice name → use OpenAI directly.
  // If voiceId looks like an ElevenLabs ID and the key+IDs are configured → use ElevenLabs.
  // Everything else falls through to OpenAI with an index-mapped voice.
  const isOpenAIVoice = OPENAI_VOICE_SET.has(cleanVoiceId);
  const elevenKey = getElevenLabsApiKey();
  const allowedEleven = getElevenLabsVoiceIds();
  const isElevenVoice =
    !isOpenAIVoice &&
    !!elevenKey &&
    allowedEleven.length > 0 &&
    (allowedEleven.includes(cleanVoiceId) || cleanVoiceId === "");

  // Resolve the effective voice label for caching
  const resolvedOpenAIVoice = isOpenAIVoice
    ? cleanVoiceId
    : pickOpenAIVoiceForIndex(elevenLabsVoiceIndex(cleanVoiceId));
  const cacheVoice = isElevenVoice ? cleanVoiceId : resolvedOpenAIVoice;

  pruneCache();
  const cacheKey = makeCacheKey(cacheVoice, cleanText);
  const cached = cache.get(cacheKey);
  if (cached) {
    return audioResponse(cached.bytes);
  }

  // ElevenLabs path (opt-in via configured key + voice IDs)
  if (isElevenVoice) {
    const resolvedEleven = cleanVoiceId || allowedEleven[0];
    const result = await callElevenLabs(cleanText, resolvedEleven, elevenKey);
    if (result.ok) {
      cache.set(cacheKey, { bytes: result.buffer, createdAt: Date.now() });
      return audioResponse(result.buffer);
    }
    console.warn(`[TTS] ElevenLabs failed (${result.status}): ${result.detail} — falling back to OpenAI TTS`);
  }

  // Default: OpenAI TTS
  const openAIResult = await callOpenAITTS(cleanText, resolvedOpenAIVoice);
  if (openAIResult.ok) {
    cache.set(cacheKey, { bytes: openAIResult.buffer, createdAt: Date.now() });
    return audioResponse(openAIResult.buffer);
  }

  return Response.json(
    { error: "TTS unavailable", detail: openAIResult.detail },
    { status: 502 }
  );
}
