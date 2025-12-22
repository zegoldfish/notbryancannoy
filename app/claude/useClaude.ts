"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { chatWithClaude } from "./actions";
import type { SavedConversation, APIMessage, DisplayMessage, MessageContent } from "./types";
import {
	getSavedConversations,
	saveConversation,
	deleteConversation,
	getCurrentConversationId,
	setCurrentConversationId as setStoredConversationId,
} from "./storage";

async function fileToBase64(file: File) {
	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

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
	const [maxTokens, setMaxTokens] = useState(600);
	const [temperature, setTemperature] = useState(0.7);
	const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
	const [conversationName, setConversationName] = useState("New Conversation");
	const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);

	// Load conversations on mount
	useEffect(() => {
		const conversations = getSavedConversations();
		setSavedConversations(conversations);
		const currentId = getCurrentConversationId();
		if (currentId) {
			const current = conversations.find((c) => c.id === currentId);
			if (current) {
				setCurrentConversationId(current.id);
				setConversationName(current.name);
				setMessages(current.messages);
				setConversationHistory(current.conversationHistory);
				setMaxTokens(current.maxTokens);
				setTemperature(current.temperature);
			}
		}
	}, []);

	// Auto-save current conversation
	useEffect(() => {
		if (messages.length === 0) return;

		const id = currentConversationId || `conv_${Date.now()}`;
		const existing = getSavedConversations();
		const existingCreatedAt = existing.find((c) => c.id === currentConversationId)?.createdAt;

		const conversation: SavedConversation = {
			id,
			name: conversationName,
			messages,
			conversationHistory,
			maxTokens,
			temperature,
			createdAt: existingCreatedAt || Date.now(),
			updatedAt: Date.now(),
		};

		if (!currentConversationId) {
			setCurrentConversationId(id);
			setStoredConversationId(id);
		}

		saveConversation(conversation);
		setSavedConversations(getSavedConversations());
	}, [messages, conversationHistory, maxTokens, temperature, conversationName, currentConversationId]);

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
					       role: "user" as const,
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

		       const clampedTokens = Math.max(50, Math.min(4000, maxTokens));
		       const response = await chatWithClaude({
			       messages: newHistory,
			       maxTokens: clampedTokens,
			       temperature,
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
		       setCurrentConversationId(null);
		       setStoredConversationId(null);
		       setConversationName("New Conversation");
	       }

	       function handleLoadConversation(id: string) {
		       const conversations = getSavedConversations();
		       const conversation = conversations.find((c) => c.id === id);
		       if (!conversation) return;

		       setCurrentConversationId(conversation.id);
		       setStoredConversationId(conversation.id);
		       setConversationName(conversation.name);
		       setMessages(conversation.messages);
		       setConversationHistory(conversation.conversationHistory);
		       setMaxTokens(conversation.maxTokens);
		       setTemperature(conversation.temperature);
		       setFiles([]);
		       setImageUrls([]);
		       setImageBase64s([]);
		       setMediaTypes([]);
		       setQuestion("");
	       }

	       function handleDeleteConversation(id: string) {
		       deleteConversation(id);
		       setSavedConversations(getSavedConversations());
		       if (currentConversationId === id) {
			       handleClearChat();
		       }
	       }

	       function handleRenameConversation(name: string) {
		       setConversationName(name);
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
		       maxTokens,
		       setMaxTokens,
		       temperature,
		       setTemperature,
		       currentConversationId,
		       conversationName,
		       savedConversations,
		       handleFileChange,
		       handleAskQuestion,
		       handleClearChat,
		       handleLoadConversation,
		       handleDeleteConversation,
		       handleRenameConversation,
	       };
}
