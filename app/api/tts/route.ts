import { getElevenLabsApiKey, getElevenLabsVoiceIds } from "@/lib/voices";

export const runtime = "nodejs";

type CacheEntry = { bytes: ArrayBuffer; createdAt: number };

const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_ENTRIES = 200;
const cache = new Map<string, CacheEntry>();

function makeCacheKey(voiceId: string, text: string): string {
  return `${voiceId}\n${text}`;
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
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, "")
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

export async function POST(req: Request) {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    return Response.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
  }

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

  const allowedVoices = getElevenLabsVoiceIds();
  const resolvedVoiceId = cleanVoiceId || allowedVoices[0] || "";
  const strictAllowlist =
    (process.env.ELEVENLABS_STRICT_VOICE_ALLOWLIST ?? "").toLowerCase() === "true" ||
    process.env.ELEVENLABS_STRICT_VOICE_ALLOWLIST === "1";

  if (!resolvedVoiceId) {
    return Response.json(
      { error: "voiceId is required (or set ELEVENLABS_VOICE_IDS)" },
      { status: 400 }
    );
  }

  if (strictAllowlist && allowedVoices.length > 0 && !allowedVoices.includes(resolvedVoiceId)) {
    return Response.json(
      { error: "voiceId is not in ELEVENLABS_VOICE_IDS allowlist" },
      { status: 400 }
    );
  }

  pruneCache();
  const cacheKey = makeCacheKey(resolvedVoiceId, cleanText);
  const cached = cache.get(cacheKey);
  if (cached) {
    return new Response(cached.bytes, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  }

  const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
    resolvedVoiceId
  )}?output_format=mp3_44100_128`;

  const elevenRes = await fetch(elevenUrl, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: cleanText,
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

  if (!elevenRes.ok) {
    const errText = await elevenRes.text().catch(() => "");
    return Response.json(
      { error: "ElevenLabs request failed", status: elevenRes.status, detail: errText.slice(0, 500) },
      { status: 502 }
    );
  }

  const buffer = await elevenRes.arrayBuffer();
  cache.set(cacheKey, { bytes: buffer, createdAt: Date.now() });

  return new Response(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
