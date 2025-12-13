"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { getImage, updateImage } from "@app/images/actions";
import { analyzeImageWithPrompt } from "@app/claude/actions";
import Image from "next/image";
import Modal from "@app/components/Modal";
import { Unauthorized } from "@app/components/Unauthorized";
import type { ImageItem } from "@/app/types";

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

export default function EditImagePage({ params }: { params: Promise<{ imageId: string }> }) {
	const { imageId } = use(params);
	const router = useRouter();
	const { session, status } = useUser();
	const [loading, setLoading] = useState(true);
	const [image, setImage] = useState<ImageItem | null>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | undefined>(undefined);
	const [isError, setIsError] = useState(false);
	const [tagsInput, setTagsInput] = useState("");
	const tags = normalizeTags(tagsInput);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [suggesting, setSuggesting] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [temperature, setTemperature] = useState(0.3);
	const [promptContext, setPromptContext] = useState("");

	useEffect(() => {
		if (status === "loading") return;
		if (status === "unauthenticated" || !session) return;

		async function loadImage() {
			try {
				const result = await getImage(imageId);
				if ("error" in result) {
					setMessage(result.error);
					setIsError(true);
					setLoading(false);
					return;
				}
				const img = result.item as ImageItem;
				setImage(img);
				setTitle(img.title || "");
				setTagsInput((img.tags || []).join(", "));
				setDescription(img.description || "");
			} catch (error) {
				console.error("Failed to load image", error);
				setMessage("Failed to load image");
				setIsError(true);
			} finally {
				setLoading(false);
			}
		}

		loadImage();
	}, [imageId, session, status]);

	if (status === "loading" || loading) {
		return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
	}

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

	if (!image) {
		return (
			<div className="min-h-screen bg-slate-50 py-16 px-4">
				<div className="mx-auto max-w-3xl">
					<div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
						<h1 className="text-xl font-semibold">Image not found</h1>
						<p className="mt-2 text-sm">{message || "The requested image could not be loaded."}</p>
					</div>
				</div>
			</div>
		);
	}

	// Resize/compress the image from URL and return base64 (without data URL prefix)
	async function getResizedBase64FromUrl(
		imageUrl: string,
		options?: { maxDim?: number; quality?: number; format?: "image/jpeg" | "image/webp" | "image/png" }
	) {
		const maxDim = options?.maxDim ?? 800;
		const quality = options?.quality ?? 0.8;
		const format: "image/jpeg" | "image/webp" | "image/png" = options?.format ?? "image/jpeg";

		// Fetch image and create blob
		const response = await fetch(imageUrl);
		const blob = await response.blob();
		const bitmap = await createImageBitmap(blob);

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

		const dataUrl = canvas.toDataURL(format, quality);
		const base64 = dataUrl.split(",")[1] || "";
		return { base64, mediaType: format };
	}

	async function getResizedBase64Adaptive(imageUrl: string) {
		const attempts = [
			{ maxDim: 800, quality: 0.8 },
			{ maxDim: 640, quality: 0.65 },
			{ maxDim: 512, quality: 0.55 },
		];

		for (const attempt of attempts) {
			const { base64, mediaType } = await getResizedBase64FromUrl(imageUrl, {
				maxDim: attempt.maxDim,
				quality: attempt.quality,
				format: "image/jpeg",
			});

			if (base64.length <= 900_000) {
				return { base64, mediaType };
			}
		}

		throw new Error("Image is too large even after compression.");
	}

	async function handleSuggest() {
		if (!image?.url) {
			setMessage("No image available to analyze.");
			setIsError(true);
			return;
		}

		setSuggesting(true);
		setMessage(undefined);
		setIsError(false);

		try {
			const { base64, mediaType } = await getResizedBase64Adaptive(image.url);

			let prompt =
				"Return ONLY strict JSON in this shape: {\n  \"title\": string,\n  \"tags\": string[],\n  \"description\": string\n}\nRules: no prose, no code fences, no markdown, no trailing commas. Tags must be concise strings. Title should be short and descriptive.";
			
			if (promptContext.trim()) {
				prompt = `${promptContext.trim()}\n\n${prompt}`;
			}
			
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
				setMessage("Suggestions applied. You can edit before saving.");
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

		setSaving(true);
		setMessage(undefined);

		try {
			const updates = {
				title,
				tags: normalizeTags(tagsInput),
				description,
			};

			const result = await updateImage(imageId, updates);

			if ("error" in result) {
				setMessage(result.error);
				setIsError(true);
			} else {
				setMessage("Image updated successfully!");
				setIsError(false);
				// Optionally redirect after a delay
				setTimeout(() => router.push("/media"), 2000);
			}
		} catch (error) {
			console.error("Update error:", error);
			setMessage("An error occurred while updating");
			setIsError(true);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 py-16 px-4">
			<div className="mx-auto max-w-xl">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-semibold text-slate-900">Edit Image</h1>
					<p className="mt-2 text-sm text-slate-600">Update the metadata for your image.</p>
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
					{image.url && (
						<div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
							<button
								type="button"
								onClick={() => setPreviewOpen(true)}
								className="w-full cursor-pointer"
							>
								<Image
									src={image.url}
									alt={image.description || "Image preview"}
									width={640}
									height={360}
									className="h-64 w-full object-cover hover:opacity-90 transition"
									unoptimized
								/>
							</button>
						</div>
					)}

					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-3">
							<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div className="text-sm text-slate-700">Need tags? Let Claude suggest them.</div>
								<button
									type="button"
									onClick={handleSuggest}
									disabled={suggesting}
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
							<div className="space-y-2 pt-2">
								<label className="text-sm font-medium text-slate-700" htmlFor="promptContext">
									Prompt Context (optional)
								</label>
								<textarea
									id="promptContext"
									value={promptContext}
									onChange={(e) => setPromptContext(e.target.value)}
									rows={2}
									className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
									placeholder="Add context to guide Claude's suggestions (e.g., 'This is from a vacation in Paris' or 'Focus on the architectural elements')"
								/>
								<p className="text-xs text-slate-500">Provide additional context to help Claude better understand the image.</p>
							</div>
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
								placeholder="Optional description"
							/>
						</div>

						<div className="flex gap-3">
							<button
								type="button"
								onClick={() => router.push("/media")}
								className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={saving}
								className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{saving ? "Saving..." : "Save Changes"}
							</button>
						</div>
					</form>
				</div>
			</div>

			<Modal
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				title={title || "Preview"}
				description=""
			>
				{image.url && (
					<div className="relative w-full" style={{ minHeight: "50vh", maxHeight: "70vh" }}>
						<Image
							src={image.url}
							alt={description || "Preview"}
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
