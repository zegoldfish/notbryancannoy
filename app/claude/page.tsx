"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import { useUser } from "@context/UserContext";
import { Unauthorized } from "@app/components/Unauthorized";
import { useClaude } from "./useClaude";

export default function ClaudePage() {
	const { session, status } = useUser();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const {
		file,
		imageBase64,
		question,
		setQuestion,
		loading,
		messages,
		handleFileChange,
		handleAskQuestion,
		handleClearChat,
	} = useClaude();

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	if (status === "loading") {
		return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
	}

	if (status === "unauthenticated" || !session) {
		return <Unauthorized />;
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
										handleAskQuestion(e);
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