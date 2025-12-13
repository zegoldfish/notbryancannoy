"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { getPresignedPost } from "./actions";
import { createImage } from "@app/images/actions";
import { analyzeImageWithPrompt } from "@app/claude/actions";
import Image from "next/image";

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

export default function UploadFile() {
  const router = useRouter();
  const { session, status } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isError, setIsError] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const tags = normalizeTags(tagsInput);
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!session) return null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (file && file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
      setFile(file);
    } else {
      setPreviewUrl(null);
      setFile(file || null);
    }
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
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const prompt =
        "Return ONLY strict JSON in this shape: {\n  \"tags\": string[],\n  \"description\": string\n}\nRules: no prose, no code fences, no markdown, no trailing commas. Tags must be concise strings.";
      const response = await analyzeImageWithPrompt({
        imageBase64: base64,
        mediaType: file.type as "image/png" | "image/jpeg" | "image/webp",
        prompt,
        maxTokens: 200,
        temperature: 0,
      });

      let parsed: { tags?: string[]; description?: string } | null = null;
      try {
        parsed = JSON.parse(response.text || "{}");
      } catch (err) {
        // Fallback: attempt to extract a JSON object substring
        try {
          const match = (response.text || "").match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch (innerErr) {
          console.warn("Failed to parse Claude suggestion JSON", innerErr);
        }
      }

      if (parsed?.tags?.length) {
        setTagsInput(normalizeTags(parsed.tags.join(", ")).join(", "));
      }
      if (parsed?.description) {
        setDescription(parsed.description);
      }

      if (!parsed?.tags && !parsed?.description) {
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
          tags,
          description,
        });

        if ("error" in createResult) {
          setMessage(`Uploaded to S3 but failed to save metadata: ${createResult.error}`);
          setIsError(true);
        } else {
          setMessage(`File "${file.name}" uploaded successfully!`);
          setIsError(false);
          setFile(null);
          setTagsInput("");
          setDescription("");
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
                onChange={handleFileChange}
                className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
            </div>

            {previewUrl && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                <Image
                  src={previewUrl}
                  alt="Selected file preview"
                  width={640}
                  height={360}
                  className="h-64 w-full object-cover"
                />
              </div>
            )}

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
    </div>
  );
}
