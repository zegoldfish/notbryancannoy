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
	images: { base64: string; mediaType: "image/png" | "image/jpeg" | "image/webp" }[];
	conversationHistory: APIMessage[];
};

export function useClaude() {
	const [files, setFiles] = useState<File[]>([]);
	const [imageUrls, setImageUrls] = useState<string[]>([]);
	const [imageBase64s, setImageBase64s] = useState<string[]>([]);
	const [mediaTypes, setMediaTypes] = useState<("image/png" | "image/jpeg" | "image/webp")[]>([]);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<DisplayMessage[]>([]);
	const [conversationHistory, setConversationHistory] = useState<APIMessage[]>([]);

	       async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		       const fileList = event.target.files;
		       if (!fileList) {
			       setFiles([]);
			       setImageUrls([]);
			       setImageBase64s([]);
			       setMediaTypes([]);
			       return;
		       }
		       const filesArr = Array.from(fileList);
		       setFiles(filesArr);

		       // Clean up old URLs
		       imageUrls.forEach(url => URL.revokeObjectURL(url));

		       const urls: string[] = [];
		       const base64s: string[] = [];
		       const types: ("image/png" | "image/jpeg" | "image/webp")[] = [];

		       for (const file of filesArr) {
			       const url = URL.createObjectURL(file);
			       urls.push(url);
			       base64s.push(await fileToBase64(file));
			       types.push(file.type as "image/png" | "image/jpeg" | "image/webp");
		       }
		       setImageUrls(urls);
		       setImageBase64s(base64s);
		       setMediaTypes(types);

		       setMessages((prev) => [
			       ...prev,
			       ...urls.map((url, idx) => ({
				       id: `${Date.now()}-${idx}`,
				       role: "user",
				       content: "📎 Uploaded an image",
				       imageUrl: url,
				       timestamp: Date.now(),
			       })),
		       ]);
	       }

	       async function askClaude({ question, images, conversationHistory }: AskParams) {
		       const content: MessageContent[] = [];

		       for (const img of images) {
			       content.push({
				       type: "image",
				       source: {
					       type: "base64",
					       media_type: img.mediaType,
					       data: img.base64,
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
			       const images = imageBase64s.map((base64, idx) => ({
				       base64,
				       mediaType: mediaTypes[idx],
			       }));
			       const { responseText, newHistory } = await askClaude({
				       question: trimmed,
				       images,
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
		       setFiles([]);
		       setImageUrls([]);
		       setImageBase64s([]);
		       setMediaTypes([]);
		       setQuestion("");
	       }

	       return {
		       files,
		       imageUrls,
		       imageBase64s,
		       mediaTypes,
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
