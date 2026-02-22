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

export function pickVoiceIdForIndex(index: number): string | undefined {
  const voiceIds = getElevenLabsVoiceIds();
  if (voiceIds.length === 0) return undefined;
  return voiceIds[index % voiceIds.length];
}

