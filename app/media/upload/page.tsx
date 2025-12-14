"use client";

import { useRef, useState } from "react";
import { useUser } from "@context/UserContext";
import { getPresignedPost } from "./actions";
import { createImage } from "@app/images/actions";
import { suggestImageMetadata } from "@/app/lib/suggestImage";
import { normalizeTags } from "@/app/lib/normalizeTags";
import Image from "next/image";
import Modal from "@app/components/Modal";
import StatusBanner from "@app/components/StatusBanner";
import MetadataFields from "@app/components/MetadataFields";
import SuggestControls from "@app/components/SuggestControls";
import SubmitButton from "@app/components/SubmitButton";
import { Unauthorized } from "@app/components/Unauthorized";

function isSafeBlobUrl(url: string | null): url is string {
	return typeof url === "string" && url.startsWith("blob:");
}

function validateRemoteImageUrl(rawUrl: string): { ok: boolean; reason?: string } {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      return { ok: false, reason: "URL must start with https://" };
    }

    const hostname = url.hostname.toLowerCase();
    const blockedHosts = ["localhost", "127.0.0.1", "::1"];
    if (blockedHosts.includes(hostname)) {
      return { ok: false, reason: "Local addresses are not allowed" };
    }

    if (/^(10\.|127\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(hostname)) {
      return { ok: false, reason: "Private network addresses are not allowed" };
    }

    if (/\.(local|internal|lan)$/i.test(hostname)) {
      return { ok: false, reason: "Private/internal hosts are not allowed" };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "Please enter a valid URL" };
  }
}

export default function UploadFile() {
  const { session, status } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isError, setIsError] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [temperature, setTemperature] = useState(0.3);
  const [context, setContext] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const urlRequestIdRef = useRef(0);

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
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

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
      setFileInputKey((key) => key + 1);
      return;
    }

    setMessage(undefined);
    setIsError(false);
    setPreviewUrl(URL.createObjectURL(file));
    setFile(file);
    setUrlInput("");
  }

  async function handleUrlInput(value: string) {
    const requestId = ++urlRequestIdRef.current;
    setUrlInput(value);
    
    if (!value.trim()) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    try {
      // Validate URL format and block private/internal addresses to avoid SSRF-style fetches
      const urlCheck = validateRemoteImageUrl(value);
      if (!urlCheck.ok) {
        setMessage(urlCheck.reason);
        setIsError(true);
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      
      setMessage(undefined);
      setIsError(false);
      
      // Fetch the image to validate it's accessible
      const response = await fetch(value, { method: "HEAD" });
      if (requestId !== urlRequestIdRef.current) return; // stale
      if (!response.ok) {
        setMessage("Could not access the image URL");
        setIsError(true);
        setFile(null);
        setPreviewUrl(null);
        return;
      }

      const contentType = response.headers.get("content-type");
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!contentType || !allowed.some(type => contentType.includes(type))) {
        setMessage("URL must point to a JPEG, PNG, or WEBP image");
        setIsError(true);
        setFile(null);
        setPreviewUrl(null);
        return;
      }

      // Set the URL as the preview
      setPreviewUrl(value);
      
      // Create a File object from the URL for upload
      const imageResponse = await fetch(value);
      if (requestId !== urlRequestIdRef.current) return; // stale
      const blob = await imageResponse.blob();
      const urlParts = value.split("/");
      const filename = urlParts[urlParts.length - 1].split("?")[0] || "image.jpg";
      const urlFile = new File([blob], filename, { type: blob.type });
      setFile(urlFile);
    } catch (error) {
      if (error instanceof TypeError) {
        setMessage("Please enter a valid URL");
      } else {
        setMessage("Failed to load image from URL");
      }
      setIsError(true);
      setFile(null);
      setPreviewUrl(null);
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
      const result = await suggestImageMetadata(file, temperature, context || undefined);

      if (result.title) {
        setTitle(result.title);
      }
      if (result.tags?.length) {
        setTagsInput(normalizeTags(result.tags.join(", ")).join(", "));
      }
      if (result.description) {
        setDescription(result.description);
      }

      if (!result.title && !result.tags && !result.description) {
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
          setUrlInput("");
          setInputMode("file");
          if (previewUrl && isSafeBlobUrl(previewUrl)) {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewUrl(null);
          setFileInputKey((key) => key + 1);
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
          <StatusBanner message={message} isError={isError} />
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Image Source</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("file");
                    setUrlInput("");
                    setFile(null);
                    setFileInputKey((key) => key + 1);
                    if (previewUrl && !previewUrl.startsWith("blob:")) {
                      setPreviewUrl(null);
                    }
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                    inputMode === "file"
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("url");
                    setFile(null);
                    setFileInputKey((key) => key + 1);
                    if (previewUrl && previewUrl.startsWith("blob:")) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition ${
                    inputMode === "url"
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Paste URL
                </button>
              </div>
            </div>

            {inputMode === "file" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="file">
                  File
                </label>
                <input
                  key={fileInputKey}
                  id="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
              </div>
            )}

            {inputMode === "url" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800" htmlFor="url">
                  Image URL
                </label>
                <input
                  id="url"
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={urlInput}
                  onChange={(e) => handleUrlInput(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                {file && urlInput && <p className="text-xs text-slate-500">URL loaded</p>}
              </div>
            )}

            {previewUrl && (
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
                    unoptimized={!previewUrl.startsWith("blob:")}
                  />
                </button>
              </div>
            )}

            <SuggestControls
              onSuggest={handleSuggest}
              suggesting={suggesting}
              disabled={!file}
              temperature={temperature}
              setTemperature={setTemperature}
              context={context}
              setContext={setContext}
            />

            <MetadataFields
              title={title}
              setTitle={setTitle}
              tagsInput={tagsInput}
              setTagsInput={setTagsInput}
              description={description}
              setDescription={setDescription}
            />

            <SubmitButton
              loading={uploading}
              loadingText="Uploading..."
              disabled={!file}
            >
              Upload
            </SubmitButton>
          </form>
        </div>
      </div>

      <Modal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title || "Preview"}
        description=""
      >
        {previewUrl && (
          <div className="relative w-full" style={{ minHeight: "50vh", maxHeight: "70vh" }}>
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized={!previewUrl.startsWith("blob:")}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
