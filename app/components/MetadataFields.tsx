"use client";

import { useId, useMemo } from "react";
import { normalizeTags } from "@/app/lib/normalizeTags";

export default function MetadataFields({
	title,
	setTitle,
	tagsInput,
	setTagsInput,
	description,
	setDescription,
	idPrefix,
}: {
	title: string;
	setTitle: (value: string) => void;
	tagsInput: string;
	setTagsInput: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	idPrefix?: string;
}) {
// Generate unique, stable IDs to avoid collisions when multiple instances render
	const generatedId = useId();
	const baseId = idPrefix ?? generatedId;
	const titleId = `${baseId}-title`;
	const tagsId = `${baseId}-tags`;
	const descriptionId = `${baseId}-description`;
	const tags = useMemo(() => normalizeTags(tagsInput), [tagsInput]);

	return (
		<>
			<div className="space-y-2">
				<label className="text-sm font-medium text-slate-800" htmlFor={titleId}>
					Title
				</label>
				<input
					id={titleId}
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
					placeholder="Optional title"
				/>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium text-slate-800" htmlFor={tagsId}>
					Tags (comma-separated)
				</label>
				<input
					id={tagsId}
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
				<label className="text-sm font-medium text-slate-800" htmlFor={descriptionId}>
					Description
				</label>
				<textarea
					id={descriptionId}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					rows={3}
					className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
					placeholder="Optional description"
				/>
			</div>
		</>
	);
}
