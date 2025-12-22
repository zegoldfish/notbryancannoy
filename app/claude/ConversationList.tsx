"use client";

import { useState } from "react";
import type { SavedConversation } from "./types";

type ConversationListProps = {
	conversations: SavedConversation[];
	currentConversationId: string | null;
	onLoad: (id: string) => void;
	onDelete: (id: string) => void;
	onRename: (name: string) => void;
	onNew: () => void;
	currentName: string;
};

export default function ConversationList({
	conversations,
	currentConversationId,
	onLoad,
	onDelete,
	onRename,
	onNew,
	currentName,
}: ConversationListProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [editingName, setEditingName] = useState(false);
	const [nameInput, setNameInput] = useState(currentName);

	const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

	function handleSaveName() {
		if (nameInput.trim()) {
			onRename(nameInput.trim());
			setEditingName(false);
		}
	}

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
			>
				<span>💬</span>
				<span className="hidden sm:inline">Conversations</span>
				<span className="text-xs text-slate-500">({conversations.length})</span>
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-10"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute right-0 top-12 z-20 w-80 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
						<div className="sticky top-0 border-b border-slate-200 bg-white p-3">
							<div className="flex items-center justify-between mb-2">
								<h3 className="text-sm font-semibold text-slate-900">Saved Conversations</h3>
								<button
									onClick={() => {
										onNew();
										setIsOpen(false);
									}}
									className="text-xs text-blue-600 hover:text-blue-700 font-medium"
								>
									+ New
								</button>
							</div>
							{currentConversationId && (
								<div className="flex items-center gap-2">
									{editingName ? (
										<>
											<input
												type="text"
												value={nameInput}
												onChange={(e) => setNameInput(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") handleSaveName();
													if (e.key === "Escape") {
														setNameInput(currentName);
														setEditingName(false);
													}
												}}
												className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
												autoFocus
											/>
											<button
												onClick={handleSaveName}
												className="text-xs text-green-600 hover:text-green-700"
											>
												Save
											</button>
										</>
									) : (
										<>
											<span className="flex-1 truncate text-xs text-slate-600">
												Current: {currentName}
											</span>
											<button
												onClick={() => {
													setNameInput(currentName);
													setEditingName(true);
												}}
												className="text-xs text-slate-500 hover:text-slate-700"
											>
												Rename
											</button>
										</>
									)}
								</div>
							)}
						</div>

						<div className="divide-y divide-slate-100">
							{sortedConversations.length === 0 ? (
								<div className="p-4 text-center text-xs text-slate-500">
									No saved conversations yet
								</div>
							) : (
								sortedConversations.map((conv) => (
									<div
										key={conv.id}
										className={`p-3 transition hover:bg-slate-50 ${
											conv.id === currentConversationId ? "bg-blue-50" : ""
										}`}
									>
										<div className="flex items-start justify-between gap-2">
											<button
												onClick={() => {
													onLoad(conv.id);
													setIsOpen(false);
												}}
												className="flex-1 text-left"
											>
												<div className="text-sm font-medium text-slate-900 truncate">
													{conv.name}
												</div>
												<div className="text-xs text-slate-500 mt-1">
													{conv.messages.length} messages
													{" · "}
													{new Date(conv.updatedAt).toLocaleDateString()}
												</div>
											</button>
											<div className="flex gap-1">
												<button
													onClick={() => {
														if (confirm("Delete this conversation?")) {
															onDelete(conv.id);
														}
													}}
													className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
												>
													🗑️
												</button>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
