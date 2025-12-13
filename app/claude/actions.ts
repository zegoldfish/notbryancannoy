"use server";

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getServerSession } from "next-auth";

const MODEL_ID = process.env.BEDROCK_MODEL_ID;

const bedrock = new BedrockRuntimeClient({
	region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2",
});

export async function analyzeImageWithPrompt({
	imageBase64,
	mediaType = "image/png",
	prompt,
	maxTokens = 600,
	temperature = 0.2,
}: {
	imageBase64: string;
	mediaType?: "image/png" | "image/jpeg" | "image/webp";
	prompt: string;
	maxTokens?: number;
	temperature?: number;
}) {
	const session = await getServerSession();
	if (!session) {
		throw new Error("Unauthorized: sign in required");
	}

	const body = {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: maxTokens,
		temperature,
		messages: [
			{
				role: "user",
				content: [
					{
						type: "image",
						source: {
							type: "base64",
							media_type: mediaType,
							data: imageBase64,
						},
					},
					{ type: "text", text: prompt },
				],
			},
		],
	};

	const command = new InvokeModelCommand({
		modelId: MODEL_ID,
		contentType: "application/json",
		accept: "application/json",
		body: JSON.stringify(body),
	});

	const res = await bedrock.send(command);
	const json = JSON.parse(new TextDecoder("utf-8").decode(res.body));

	// Normalize Anthropic content
	let text = "";
	if (typeof json.output_text === "string") {
		text = json.output_text;
	} else if (Array.isArray(json.content)) {
		text =
			json.content
				.filter((c: any) => c.type === "text" && typeof c.text === "string")
				.map((c: any) => c.text)
				.join("\n") || "";
	}

	return { raw: json, text };
}