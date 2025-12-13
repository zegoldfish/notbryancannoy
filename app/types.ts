// Claude types
export type MessageContent =
	| { type: "text"; text: string }
	| { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type ConversationMessage = {
	role: "user" | "assistant";
	content: MessageContent[] | string;
};

export type AnthropicResponse = {
	output_text?: string;
	content?: Array<{ type: string; text?: string }>;
	[key: string]: unknown;
};

// Image types
export type ImageItem = {
	imageId: string;
	title?: string;
	tags?: string[];
	description?: string;
	url?: string;
};

export type ImageCreatePayload = {
	imageId: string;
	title?: string;
	tags?: string[];
	description?: string;
};

export type ImageUpdatePayload = {
	title?: string;
	tags?: string[];
	description?: string;
};
