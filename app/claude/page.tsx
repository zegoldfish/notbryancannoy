"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@context/UserContext";
import { analyzeImageWithPrompt } from "./actions";

async function fileToBase64(file: File) {
	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export default function ClaudePage() {
	const router = useRouter();
	const { session, status } = useUser();

	const [file, setFile] = useState<File | null>(null);
	const [prompt, setPrompt] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [isError, setIsError] = useState(false);
	const [result, setResult] = useState<string | null>(null);
	const [raw, setRaw] = useState<string | null>(null);

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/signin");
		}
	}, [status, router]);

	if (status === "loading") {
		return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
	}

	if (!session) return null;

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const nextFile = event.target.files?.[0] ?? null;
		setFile(nextFile);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage(null);
		setResult(null);
		setRaw(null);
		setIsError(false);

		if (!file) {
			setMessage("Please choose an image.");
			setIsError(true);
			return;
		}

		if (!prompt.trim()) {
			setMessage("Please enter a prompt.");
			setIsError(true);
			return;
		}

		setLoading(true);

		try {
			const base64 = await fileToBase64(file);
			const response = await analyzeImageWithPrompt({
				imageBase64: base64,
				mediaType: file.type as "image/png" | "image/jpeg" | "image/webp",
				prompt,
				maxTokens: 600,
				temperature: 0.2,
			});

			setResult(response.text || "No text returned.");
			setRaw(JSON.stringify(response.raw, null, 2));
			setMessage("Analysis complete.");
			setIsError(false);
		} catch (error) {
			console.error("Analyze error", error);
			setMessage("Failed to analyze image.");
			setIsError(true);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 py-16 px-4">
			<div className="mx-auto max-w-xl">
				<div className="mb-8 text-center">
					<h1 className="text-3xl font-semibold text-slate-900">Claude Image Analyze</h1>
					<p className="mt-2 text-sm text-slate-600">Upload an image and provide a prompt to get Claude's description.</p>
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
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-800" htmlFor="file">
								Image
							</label>
							<input
								id="file"
								type="file"
								accept="image/png,image/jpeg,image/webp"
								onChange={handleFileChange}
								className="block w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 shadow-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
							/>
							{file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-800" htmlFor="prompt">
								Prompt
							</label>
							<textarea
								id="prompt"
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								rows={4}
								className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
								placeholder="Describe what you want Claude to analyze."
							/>
						</div>

						<button
							type="submit"
							disabled={loading || !file || !prompt.trim()}
							className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? "Analyzing..." : "Analyze with Claude"}
						</button>
					</form>
				</div>

				{result && (
					<div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<h2 className="text-sm font-semibold text-slate-800">Result</h2>
						<p className="mt-2 whitespace-pre-line text-sm text-slate-700">{result}</p>
					</div>
				)}

				{raw && (
					<div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<h2 className="text-sm font-semibold text-slate-800">Raw JSON (debug)</h2>
						<pre className="mt-2 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
							{raw}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}