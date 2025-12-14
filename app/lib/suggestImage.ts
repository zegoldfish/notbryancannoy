import { analyzeImageWithPrompt } from "@app/claude/actions";

/**
 * Validates and sanitizes the context parameter to prevent prompt injection attacks
 * @param context - The user-provided context string
 * @returns Sanitized context string or undefined if invalid
 */
function sanitizeContext(context?: string): string | undefined {
	if (!context || typeof context !== "string") {
		return undefined;
	}

	// Trim whitespace
	let sanitized = context.trim();

	// Check maximum length (limit to 500 characters to prevent token abuse)
	const MAX_LENGTH = 500;
	if (sanitized.length > MAX_LENGTH) {
		sanitized = sanitized.substring(0, MAX_LENGTH);
	}

	// Remove or escape characters commonly used in prompt injection
	// This includes newlines, system-level commands, and special tokens
	sanitized = sanitized
		// Replace multiple newlines with a single space
		.replace(/\n+/g, " ")
		// Replace multiple spaces with a single space
		.replace(/\s+/g, " ")
		// Remove potential prompt injection markers and commands
		.replace(/[<>{}[\]]/g, "")
		// Remove control characters
		.replace(/[\x00-\x1F\x7F]/g, "")
		// Trim again after replacements
		.trim();

	// Return undefined if the sanitized string is empty
	return sanitized.length > 0 ? sanitized : undefined;
}

async function getResizedBase64(
	file: File,
	options?: { maxDim?: number; quality?: number; format?: "image/jpeg" | "image/webp" | "image/png" }
) {
	const maxDim = options?.maxDim ?? 800;
	const quality = options?.quality ?? 0.8;
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

	const dataUrl = canvas.toDataURL(format, quality);
	const base64 = dataUrl.split(",")[1] || "";
	return { base64, mediaType: format };
}

async function getResizedBase64FromUrl(
	imageUrl: string,
	options?: { maxDim?: number; quality?: number; format?: "image/jpeg" | "image/webp" | "image/png" }
) {
	const maxDim = options?.maxDim ?? 800;
	const quality = options?.quality ?? 0.8;
	const format: "image/jpeg" | "image/webp" | "image/png" = options?.format ?? "image/jpeg";

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

async function getResizedBase64Adaptive(
	fileOrUrl: File | string
): Promise<{ base64: string; mediaType: string }> {
	const attempts = [
		{ maxDim: 800, quality: 0.8 },
		{ maxDim: 640, quality: 0.65 },
		{ maxDim: 512, quality: 0.55 },
	];

	const isFile = fileOrUrl instanceof File;

	for (const attempt of attempts) {
		const { base64, mediaType } = isFile
			? await getResizedBase64(fileOrUrl, {
					maxDim: attempt.maxDim,
					quality: attempt.quality,
					format: "image/jpeg",
			  })
			: await getResizedBase64FromUrl(fileOrUrl, {
					maxDim: attempt.maxDim,
					quality: attempt.quality,
					format: "image/jpeg",
			  });

		if (base64.length <= 900_000) {
			return { base64, mediaType };
		}
	}

	throw new Error("Image is too large even after compression; please choose a smaller image.");
}

export async function suggestImageMetadata(
	fileOrUrl: File | string,
	temperature: number,
	context?: string
): Promise<{
	title?: string;
	tags?: string[];
	description?: string;
}> {
	const { base64, mediaType } = await getResizedBase64Adaptive(fileOrUrl);

	// Sanitize the context to prevent prompt injection
	const sanitizedContext = sanitizeContext(context);

	const basePrompt =
		"Return ONLY strict JSON in this shape: {\n  \"title\": string,\n  \"tags\": string[],\n  \"description\": string\n}\nRules: no prose, no code fences, no markdown, no trailing commas. Tags must be concise strings. Title should be short and descriptive.";
	const prompt = sanitizedContext ? `${sanitizedContext}\n\n${basePrompt}` : basePrompt;

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

	if (!parsed) {
		throw new Error("Could not parse Claude response");
	}

	return {
		title: parsed.title,
		tags: parsed.tags,
		description: parsed.description,
	};
}
