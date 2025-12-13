"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@context/UserContext";
import { chatWithClaude } from "./actions";
import { Unauthorized } from "@app/components/Unauthorized";

async function fileToBase64(file: File) {
	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

type MessageContent = 
	| { type: "text"; text: string }
	| { type: "image"; source: { type: "base64"; media_type: string; data: string } };

type APIMessage = {
	role: "user" | "assistant";
	content: MessageContent[] | string;
};

type DisplayMessage = {
	id: string;
	role: "user" | "assistant";
	content: string;
	imageUrl?: string;
	timestamp: number;
};

export default function ClaudePage() {
	const { session, status } = useUser();

	const [file, setFile] = useState<File | null>(null);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [imageBase64, setImageBase64] = useState<string | null>(null);
	const [mediaType, setMediaType] = useState<"image/png" | "image/jpeg" | "image/webp" | null>(null);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const [messages, setMessages] = useState<DisplayMessage[]>([]);
	const [conversationHistory, setConversationHistory] = useState<APIMessage[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (status === "loading") {
		return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
	}

	if (status === "unauthenticated" || !session) {
		return <Unauthorized />;
	}

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

			// Add system message about uploaded image
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

	async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!question.trim()) return;

		const userMessage: DisplayMessage = {
			id: Date.now().toString(),
			role: "user",
			content: question,
			timestamp: Date.now(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setQuestion("");
		setLoading(true);

		try {
			// Build content array for this user message
			const content: MessageContent[] = [];
			
			// Include image if available (only on first question after upload, or keep in context)
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

			// Build new conversation history with this turn
			const newHistory: APIMessage[] = [
				...conversationHistory,
				{ role: "user", content },
			];

			const response = await chatWithClaude({
				messages: newHistory,
				maxTokens: 600,
				temperature: 0.7,
			});

			const assistantMessage: DisplayMessage = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: response.text || "No response returned.",
				timestamp: Date.now(),
			};

			setMessages((prev) => [...prev, assistantMessage]);
			
			// Update conversation history with assistant response
			setConversationHistory([
				...newHistory,
				{ role: "assistant", content: response.text || "No response." },
			]);
		} catch (error) {
			console.error("Chat error", error);
			const errorMessage: DisplayMessage = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: "Failed to get a response. Please try again.",
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, errorMessage]);
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

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col">
			<div className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
				<div className="mx-auto max-w-3xl flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-slate-900">Chat with Claude</h1>
						<p className="text-sm text-slate-600">Ask anything, optionally include an image for visual analysis</p>
					</div>
					{messages.length > 0 && (
						<button
							onClick={handleClearChat}
							className="text-sm text-slate-600 hover:text-slate-900 underline"
						>
							Clear chat
						</button>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-4 py-6">
				<div className="mx-auto max-w-3xl space-y-4">
					{messages.length === 0 && (
						<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
							<p className="text-sm text-slate-600">Start a conversation with Claude. Upload an image for visual analysis (optional).</p>
						</div>
					)}

					{messages.map((msg) => (
						<div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
							<div
								className={`max-w-[80%] rounded-2xl px-4 py-3 ${
									msg.role === "user"
										? "bg-blue-600 text-white"
										: "bg-white border border-slate-200 text-slate-900"
								}`}
							>
								{msg.imageUrl && (
									<div className="mb-2">
										<img
											src={msg.imageUrl}
											alt="Uploaded"
											className="max-h-48 rounded-lg object-cover"
										/>
									</div>
								)}
								<p className="text-sm whitespace-pre-line">{msg.content}</p>
							</div>
						</div>
					))}

					{loading && (
						<div className="flex justify-start">
							<div className="max-w-[80%] rounded-2xl border border-slate-200 bg-white px-4 py-3">
								<p className="text-sm text-slate-600">Claude is thinking...</p>
							</div>
						</div>
					)}

					<div ref={messagesEndRef} />
				</div>
			</div>

			<div className="border-t border-slate-200 bg-white px-4 py-4 shadow-sm">
				<div className="mx-auto max-w-3xl space-y-3">
					<div className="flex items-center gap-3">
						<label
							htmlFor="file"
							className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
						>
							{file ? "Change image" : "Upload image"}
						</label>
						<input
							id="file"
							type="file"
							accept="image/png,image/jpeg,image/webp"
							onChange={handleFileChange}
							className="hidden"
						/>
						{file && <span className="text-xs text-slate-500">{file.name}</span>}
					</div>

					<form onSubmit={handleAskQuestion} className="flex items-end gap-2">
						<div className="flex-1">
							<textarea
								value={question}
								onChange={(e) => setQuestion(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										handleAskQuestion(e as any);
									}
								}}
								rows={1}
								placeholder={imageBase64 ? "Ask a question about the image..." : "Ask Claude anything..."}
								className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
							/>
						</div>
						<button
							type="submit"
							disabled={loading || !question.trim()}
							className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Send
						</button>
					</form>
					<p className="text-xs text-slate-500">Press Enter to send, Shift+Enter for new line</p>
				</div>
			</div>
		</div>
	);
}