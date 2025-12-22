"use client";

import type { SavedConversation } from "./types";

const STORAGE_KEY = "claude_conversations";
const CURRENT_CONVERSATION_KEY = "claude_current_conversation";

export function getSavedConversations(): SavedConversation[] {
	if (typeof window === "undefined") return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch (error) {
		console.error("Failed to load conversations", error);
		return [];
	}
}

export function saveConversation(conversation: SavedConversation): void {
	if (typeof window === "undefined") return;
	try {
		const conversations = getSavedConversations();
		const existingIndex = conversations.findIndex((c) => c.id === conversation.id);
		
		if (existingIndex >= 0) {
			conversations[existingIndex] = conversation;
		} else {
			conversations.push(conversation);
		}
		
		localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
	} catch (error) {
		console.error("Failed to save conversation", error);
	}
}

export function deleteConversation(id: string): void {
	if (typeof window === "undefined") return;
	try {
		const conversations = getSavedConversations().filter((c) => c.id !== id);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
	} catch (error) {
		console.error("Failed to delete conversation", error);
	}
}

export function getCurrentConversationId(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(CURRENT_CONVERSATION_KEY);
	} catch (error) {
		return null;
	}
}

export function setCurrentConversationId(id: string | null): void {
	if (typeof window === "undefined") return;
	try {
		if (id) {
			localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
		} else {
			localStorage.removeItem(CURRENT_CONVERSATION_KEY);
		}
	} catch {
		console.error("Failed to set current conversation");
	}
}
