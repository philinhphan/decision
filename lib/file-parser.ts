import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const MAX_CONTENT_LENGTH = 4000;

const TEXT_EXTENSIONS = new Set([
    "txt", "md", "csv", "json", "xml", "yaml", "yml", "log", "ini", "cfg",
    "conf", "toml", "env", "html", "htm", "css", "js", "ts", "py", "java",
    "c", "cpp", "h", "rb", "go", "rs", "sql", "sh", "bat",
]);

const IMAGE_MIME_TYPES = new Set([
    "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
]);

export interface ParsedFile {
    fileName: string;
    content: string;
    type: string;
}

function getExtension(fileName: string): string {
    return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function truncate(text: string): string {
    if (text.length <= MAX_CONTENT_LENGTH) return text;
    return text.slice(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated...]";
}

async function parseTextFile(buffer: Buffer, fileName: string): Promise<string> {
    const text = buffer.toString("utf-8");
    return truncate(text.trim());
}

async function parsePdf(buffer: Buffer): Promise<string> {
    // Lazy require to avoid pdf-parse v1 bug: it tries to read a test PDF on module init
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return truncate((data.text || "").trim());
}

async function parseImage(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Describe and extract all text/information from this image named "${fileName}". If it contains text, transcribe it. If it's a chart/diagram, describe the data. Be thorough but concise.`,
                    },
                    {
                        type: "image",
                        image: dataUrl,
                    },
                ],
            },
        ],
        maxOutputTokens: 1000,
    });

    return truncate(result.text.trim());
}

export async function parseFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string
): Promise<ParsedFile> {
    const ext = getExtension(fileName);

    let content: string;

    if (mimeType === "application/pdf" || ext === "pdf") {
        content = await parsePdf(buffer);
    } else if (IMAGE_MIME_TYPES.has(mimeType)) {
        content = await parseImage(buffer, mimeType, fileName);
    } else if (TEXT_EXTENSIONS.has(ext) || mimeType.startsWith("text/")) {
        content = await parseTextFile(buffer, fileName);
    } else {
        // Try text as fallback
        try {
            content = await parseTextFile(buffer, fileName);
        } catch {
            throw new Error(`Unsupported file type: ${mimeType} (${ext})`);
        }
    }

    return { fileName, content, type: mimeType };
}
