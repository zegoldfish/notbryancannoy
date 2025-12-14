"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { getImage, updateImage } from "@app/images/actions";
import { suggestImageMetadata } from "@/app/lib/suggestImage";
import Image from "next/image";
import Modal from "@app/components/Modal";
import StatusBanner from "@app/components/StatusBanner";
import MetadataFields from "@app/components/MetadataFields";
import SuggestControls from "@app/components/SuggestControls";
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
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [suggesting, setSuggesting] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [temperature, setTemperature] = useState(0.3);

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
			const result = await suggestImageMetadata(image.url, temperature);

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

				<StatusBanner message={message} isError={isError} />

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
						<SuggestControls
							onSuggest={handleSuggest}
							suggesting={suggesting}
							temperature={temperature}
							setTemperature={setTemperature}
						/>

						<MetadataFields
							title={title}
							setTitle={setTitle}
							tagsInput={tagsInput}
							setTagsInput={setTagsInput}
							description={description}
							setDescription={setDescription}
						/>

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


