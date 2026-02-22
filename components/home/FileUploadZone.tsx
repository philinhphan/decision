"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Image, File, Loader2 } from "lucide-react";

interface UploadedFile {
    name: string;
    content: string;
    type: string;
    size: number;
}

interface FileUploadZoneProps {
    files: UploadedFile[];
    onFilesChange: (files: UploadedFile[]) => void;
    disabled?: boolean;
}

function getFileIcon(type: string) {
    if (type === "application/pdf") return <FileText size={14} className="text-red-500" />;
    if (type.startsWith("image/")) return <Image size={14} className="text-blue-500" />;
    return <File size={14} className="text-gray-500" />;
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({ files, onFilesChange, disabled }: FileUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(
        async (file: File) => {
            setError(null);
            setUploading(file.name);

            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Upload failed");
                    return;
                }

                const uploaded: UploadedFile = {
                    name: data.fileName,
                    content: data.content,
                    type: data.type,
                    size: file.size,
                };

                onFilesChange([...files, uploaded]);
            } catch {
                setError("Failed to upload file");
            } finally {
                setUploading(null);
            }
        },
        [files, onFilesChange]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;

            const droppedFiles = Array.from(e.dataTransfer.files);
            droppedFiles.forEach((f) => uploadFile(f));
        },
        [disabled, uploadFile]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selected = Array.from(e.target.files ?? []);
            selected.forEach((f) => uploadFile(f));
            if (inputRef.current) inputRef.current.value = "";
        },
        [uploadFile]
    );

    const removeFile = useCallback(
        (index: number) => {
            onFilesChange(files.filter((_, i) => i !== index));
        },
        [files, onFilesChange]
    );

    return (
        <div className="space-y-3">
            {/* Drop zone */}
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !disabled && inputRef.current?.click()}
                className={`
          border border-dashed rounded px-4 py-5 text-center cursor-pointer transition-colors
          ${isDragging
                        ? "border-gray-500 bg-gray-100"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml,.html,.png,.jpg,.jpeg,.webp,.gif"
                />
                <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                        <>
                            <Loader2 size={18} className="text-gray-400 animate-spin" />
                            <p className="text-xs text-gray-500">Parsing {uploading}...</p>
                        </>
                    ) : (
                        <>
                            <Upload size={18} className="text-gray-400" />
                            <p className="text-xs text-gray-500">
                                Drop files here or click to browse
                            </p>
                            <p className="text-[10px] text-gray-400">
                                PDF, images, text files · Max 10 MB
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            {/* File list */}
            {files.length > 0 && (
                <div className="space-y-1.5">
                    {files.map((file, i) => (
                        <div
                            key={`${file.name}-${i}`}
                            className="group flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm hover:border-gray-300 transition-colors"
                        >
                            {getFileIcon(file.type)}
                            <span className="flex-1 truncate text-xs text-gray-700">{file.name}</span>
                            <span className="text-[10px] text-gray-400">{formatSize(file.size)}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(i);
                                }}
                                className="p-0.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <p className="text-[10px] text-gray-400 text-center">
                        {files.length} file{files.length !== 1 ? "s" : ""} attached · Hover to remove
                    </p>
                </div>
            )}
        </div>
    );
}
