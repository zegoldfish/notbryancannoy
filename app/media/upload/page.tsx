"use client";

import { useState } from "react";
import { useUser } from "@context/UserContext";
import { getPresignedPost } from "./actions";
import { createImage } from "@app/images/actions";
import { analyzeImageWithPrompt } from "@app/claude/actions";
import Image from "next/image";
import Modal from "@app/components/Modal";
import { Unauthorized } from "@app/components/Unauthorized";

function normalizeTags(raw: string): string[] {
	return Array.from(
		new Set(
			raw
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean)
		)
	);
}

function isSafeBlobUrl(url: string | null): url is string {
	return typeof url === "string" && url.startsWith("blob:");
}

export default function UploadFile() {
  const { session, status } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isError, setIsError] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const tags = normalizeTags(tagsInput);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.3);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (status === "unauthenticated" || !session) {
    return (
      <Unauthorized
        title="Ah ah ah..."
        message="You did not say the magic word. Please sign in."
        ctaHref="/signin"
        ctaLabel="Go to sign in"
      />
    );
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setPreviewUrl(null);
      setFile(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPreviewUrl(null);
      setFile(null);
      setMessage("Only JPEG, PNG, or WEBP images are allowed.");
      setIsError(true);
      event.target.value = "";
      return;
    }

    setMessage(undefined);
    setIsError(false);
    setPreviewUrl(URL.createObjectURL(file));
    setFile(file);
  }

  // Resize/compress the image on the client and return base64 (without data URL prefix)
  async function getResizedBase64(
    file: File,
    options?: { maxDim?: number; quality?: number; format?: "image/jpeg" | "image/webp" | "image/png" }
  ) {
    const maxDim = options?.maxDim ?? 800; // max width/height
    const quality = options?.quality ?? 0.8; // 0..1
    const prefersWebp = file.type === "image/webp";
    const prefersPng = file.type === "image/png";
    const format: "image/jpeg" | "image/webp" | "image/png" =
      options?.format ?? (prefersWebp ? "image/webp" : prefersPng ? "image/png" : "image/jpeg");

    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    // Convert to data URL
    const dataUrl = canvas.toDataURL(format, quality);
    // Strip prefix: data:<mime>;base64,
    const base64 = dataUrl.split(",")[1] || "";
    return { base64, mediaType: format };
  }

  async function getResizedBase64Adaptive(file: File) {
    const attempts = [
      { maxDim: 800, quality: 0.8 },
      { maxDim: 640, quality: 0.65 },
      { maxDim: 512, quality: 0.55 },
    ];

    for (const attempt of attempts) {
      const { base64, mediaType } = await getResizedBase64(file, {
        maxDim: attempt.maxDim,
        quality: attempt.quality,
        format: "image/jpeg", // force jpeg for smaller payloads
      });

      // base64 length ~= 4/3 of bytes; keep well under 1MB body
      if (base64.length <= 900_000) {
        return { base64, mediaType };
      }
    }

    throw new Error("Image is too large even after compression; please choose a smaller image.");
  }

  async function handleSuggest() {
    if (!file) {
      setMessage("Choose a file first.");
      setIsError(true);
      return;
    }

    setSuggesting(true);
    setMessage(undefined);
    setIsError(false);

    try {
      // Resize/compress to keep payload under ~1 MB (adaptive)
      const { base64, mediaType } = await getResizedBase64Adaptive(file);

      const prompt =
        "Return ONLY strict JSON in this shape: {\n  \"title\": string,\n  \"tags\": string[],\n  \"description\": string\n}\nRules: no prose, no code fences, no markdown, no trailing commas. Tags must be concise strings. Title should be short and descriptive.";
      const response = await analyzeImageWithPrompt({
        imageBase64: base64,
        mediaType: mediaType as "image/jpeg",
        prompt,
        maxTokens: 200,
        temperature,
      });

      let parsed: { title?: string; tags?: string[]; description?: string } | null = null;
      try {
        parsed = JSON.parse(response.text || "{}");
      } catch (err) {
        console.warn("Failed to parse Claude suggestion JSON", err);
        // Fallback: attempt to extract a JSON object substring
        try {
          const match = (response.text || "").match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch (innerErr) {
          console.warn("Failed to parse Claude suggestion JSON", innerErr);
        }
      }

      if (parsed?.title) {
        setTitle(parsed.title);
      }
      if (parsed?.tags?.length) {
        setTagsInput(normalizeTags(parsed.tags.join(", ")).join(", "));
      }
      if (parsed?.description) {
        setDescription(parsed.description);
      }

      if (!parsed?.title && !parsed?.tags && !parsed?.description) {
        setMessage("Claude responded but could not parse suggestions.");
        setIsError(true);
      } else {
        setMessage("Suggestions applied. You can edit before upload.");
        setIsError(false);
      }
    } catch (error) {
      console.error("Suggest error", error);
      setMessage("Failed to get suggestions from Claude.");
      setIsError(true);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("No file selected");
      setIsError(true);
      return;
    }

    setUploading(true);
    setMessage(undefined);

    try {
      // Get presigned POST from server
      const presignedResult = await getPresignedPost(file.name, file.type);

      if ("error" in presignedResult) {
        setMessage(presignedResult.error);
        setIsError(true);
        setUploading(false);
        return;
      }

      // Upload directly to S3 from browser
      const formData = new FormData();

      // Add presigned POST fields
      Object.entries(presignedResult.fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });

      // Add file as last field
      formData.append("file", file);

      const response = await fetch(presignedResult.url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        setMessage("Failed to upload file to S3");
        setIsError(true);
      } else {
        const tags = normalizeTags(tagsInput);

        const imageId = presignedResult.key;
        const createResult = await createImage({
          imageId,
          title,
          tags,
          description,
        });

        if ("error" in createResult) {
          setMessage(`Uploaded to S3 but failed to save metadata: ${createResult.error}`);
          setIsError(true);
        } else {
          setMessage(`File "${file.name}" uploaded successfully!`);
          setIsError(false);
          
          // Reset form completely
          setFile(null);
          setTagsInput("");
          setTitle("");
          setDescription("");
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
          const input = document.getElementById("file") as HTMLInputElement;
          if (input) input.value = "";
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("An error occurred during upload");
      setIsError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Upload Media</h1>
          <p className="mt-2 text-sm text-slate-600">Choose a file and submit to upload directly to cloud storage.</p>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg p-4 text-sm ${
              isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
            }`}
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="file">
                File
              </label>
              <input
                id="file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
            </div>

            {isSafeBlobUrl(previewUrl) && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="w-full cursor-pointer"
                >
                  <Image
                    src={previewUrl}
                    alt="Selected file preview"
                    width={640}
                    height={360}
                    className="h-64 w-full object-cover hover:opacity-90 transition"
                  />
                </button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-slate-700">Need tags? Let Claude suggest them.</div>
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={suggesting || !file}
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggesting ? "Getting suggestions..." : "Suggest tags & description"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="temperature" className="text-sm font-medium text-slate-700">
                  Temperature: {temperature.toFixed(2)}
                </label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-500">Lower = more deterministic; higher = more creative.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Optional title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="tags">
                Tags (comma-separated)
              </label>
              <input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={(e) => setTagsInput(normalizeTags(e.target.value).join(", "))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. sunset, landscape"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {tags.map((tag, idx) => (
                    <button
                      type="button"
                      key={`${tag}-${idx}`}
                      onClick={() => {
                        const filtered = tags.filter((_, i) => i !== idx);
                        setTagsInput(filtered.join(", "));
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 border border-blue-200 shadow-sm hover:bg-blue-100"
                    >
                      <span>{tag}</span>
                      <span className="text-blue-500">×</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTagsInput("")}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-100"
                  >
                    Clear tags
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Optional description of the upload"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title || "Preview"}
        description=""
      >
        {isSafeBlobUrl(previewUrl) && (
          <div className="relative w-full" style={{ minHeight: "50vh", maxHeight: "70vh" }}>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
