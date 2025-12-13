"use client";

import type React from "react";
import { useState } from "react";
import { chatWithClaude } from "./actions";

async function fileToBase64(file: File) {
	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export type MessageContent =
	| { type: "text"; text: string }
	| { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type APIMessage = {
	role: "user" | "assistant";
	content: MessageContent[] | string;
};

export type DisplayMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	imageUrl?: string;
	timestamp: number;
};

type AskParams = {
	question: string;
	imageBase64: string | null;
	mediaType: "image/png" | "image/jpeg" | "image/webp" | null;
	conversationHistory: APIMessage[];
};

export function useClaude() {
	const [file, setFile] = useState<File | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [imageBase64, setImageBase64] = useState<string | null>(null);
	const [mediaType, setMediaType] = useState<"image/png" | "image/jpeg" | "image/webp" | null>(null);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<DisplayMessage[]>([]);
	const [conversationHistory, setConversationHistory] = useState<APIMessage[]>([]);

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const nextFile = event.target.files?.[0] ?? null;
		setFile(nextFile);

		if (imageUrl) URL.revokeObjectURL(imageUrl);

		if (nextFile) {
			const url = URL.createObjectURL(nextFile);
			setImageUrl(url);
			const base64 = await fileToBase64(nextFile);
			setImageBase64(base64);
			setMediaType(nextFile.type as "image/png" | "image/jpeg" | "image/webp");

			setMessages((prev) => [
				...prev,
				{
					id: Date.now().toString(),
					role: "user",
					content: "📎 Uploaded an image",
					imageUrl: url,
					timestamp: Date.now(),
				},
			]);
		} else {
			setImageUrl(null);
			setImageBase64(null);
			setMediaType(null);
		}
	}

	async function askClaude({ question, imageBase64, mediaType, conversationHistory }: AskParams) {
		const content: MessageContent[] = [];

		if (imageBase64 && mediaType) {
			content.push({
				type: "image",
				source: {
					type: "base64",
					media_type: mediaType,
					data: imageBase64,
				},
			});
		}

		content.push({ type: "text", text: question });

		const newHistory: APIMessage[] = [...conversationHistory, { role: "user", content }];

		const response = await chatWithClaude({
			messages: newHistory,
			maxTokens: 600,
			temperature: 0.7,
		});

		return { responseText: response.text || "No response returned.", newHistory };
	}

	async function handleAskQuestion(
		event?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>
	) {
		event?.preventDefault();

		const trimmed = question.trim();
		if (!trimmed) return;

		const userMessage: DisplayMessage = {
			id: Date.now().toString(),
			role: "user",
			content: trimmed,
			timestamp: Date.now(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setQuestion("");
		setLoading(true);

		try {
			const { responseText, newHistory } = await askClaude({
				question: trimmed,
				imageBase64,
				mediaType,
				conversationHistory,
			});

			setMessages((prev) => [
				...prev,
				{
					id: (Date.now() + 1).toString(),
					role: "assistant",
					content: responseText,
					timestamp: Date.now(),
				},
			]);
			setConversationHistory([
				...newHistory,
				{ role: "assistant", content: responseText },
			]);
		} catch (error) {
			console.error("Chat error", error);
			setMessages((prev) => [
				...prev,
				{
					id: (Date.now() + 1).toString(),
					role: "assistant",
					content: "Failed to get a response. Please try again.",
					timestamp: Date.now(),
				},
			]);
		} finally {
			setLoading(false);
		}
	}

	function handleClearChat() {
		setMessages([]);
		setConversationHistory([]);
		setFile(null);
		setImageUrl(null);
		setImageBase64(null);
		setMediaType(null);
		setQuestion("");
	}

	return {
		file,
		imageUrl,
		imageBase64,
		mediaType,
		question,
		setQuestion,
		loading,
		messages,
		conversationHistory,
		handleFileChange,
		handleAskQuestion,
		handleClearChat,
	};
}
