import { openai } from "@ai-sdk/openai";

const MODEL_ID = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const model = openai(MODEL_ID);
