export type SavedConversation = {
	id: string;
	name: string;
	messages: DisplayMessage[];
	conversationHistory: APIMessage[];
	maxTokens: number;
	temperature: number;
	createdAt: number;
	updatedAt: number;
};

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
