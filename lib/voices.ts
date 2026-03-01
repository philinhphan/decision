function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getElevenLabsApiKey(): string {
  return process.env.ELEVENLABS_API_KEY ?? "";
}

export function getElevenLabsVoiceIds(): string[] {
  const voiceIds = splitList(process.env.ELEVENLABS_VOICE_IDS);
  return Array.from(new Set(voiceIds));
}

export function pickVoiceIdForIndex(index: number): string {
  const voiceIds = getElevenLabsVoiceIds();
  if (voiceIds.length > 0) return voiceIds[index % voiceIds.length];
  return pickOpenAIVoiceForIndex(index);
}

// OpenAI TTS voices available for gpt-4o-mini-tts
const OPENAI_VOICES = [
  "marin", "cedar", "alloy", "ash", "ballad", "coral",
  "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse",
] as const;

/** Map a voice index (from ElevenLabs position) to an OpenAI TTS voice name. */
export function pickOpenAIVoiceForIndex(index: number): string {
  return OPENAI_VOICES[index % OPENAI_VOICES.length];
}

/**
 * Given an ElevenLabs voiceId string, return its 0-based index in the
 * configured ELEVENLABS_VOICE_IDS list, or 0 if not found / list is empty.
 */
export function elevenLabsVoiceIndex(voiceId: string): number {
  const ids = getElevenLabsVoiceIds();
  const idx = ids.indexOf(voiceId);
  return idx >= 0 ? idx : 0;
}

