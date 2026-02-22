import { parseFile } from "@/lib/file-parser";

export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES = new Set([
    "application/pdf",
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/html",
    "text/xml",
    "application/json",
    "application/xml",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
]);

function isAllowedType(mimeType: string): boolean {
    if (ALLOWED_TYPES.has(mimeType)) return true;
    if (mimeType.startsWith("text/")) return true;
    return false;
}

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return Response.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return Response.json(
                { error: `File too large. Maximum size is 10 MB.` },
                { status: 400 }
            );
        }

        if (!isAllowedType(file.type) && file.type !== "") {
            return Response.json(
                { error: `Unsupported file type: ${file.type}` },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await parseFile(buffer, file.name, file.type || "text/plain");

        return Response.json(result);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse file";
        return Response.json({ error: message }, { status: 500 });
    }
}
