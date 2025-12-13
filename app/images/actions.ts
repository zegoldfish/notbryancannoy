"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	PutCommand,
	GetCommand,
	DeleteCommand,
	UpdateCommand,
	ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { z } from "zod";

const ImageSchema = z.object({
	imageId: z.string().min(1, "imageId is required"),
	tags: z.array(z.string()).default([]),
	description: z.string().default(""),
});

const UpdateImageSchema = z.object({
	tags: z.array(z.string()).optional(),
	description: z.string().optional(),
});

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const IMAGES_TABLE = process.env.IMAGES_TABLE;

function assertTable() {
	if (!IMAGES_TABLE) {
		throw new Error("IMAGES_TABLE is not configured");
	}
}

async function requireSession() {
	const session = await getServerSession(authOptions);
	if (!session) {
		throw new Error("Unauthorized: sign in required");
	}
}

export async function createImage(item: Record<string, any>) {
	await requireSession();
	assertTable();

	const parsed = ImageSchema.safeParse(item);
	if (!parsed.success) {
		return { error: parsed.error.issues?.[0]?.message || "Invalid image payload" };
	}

	const data = parsed.data;
	const imageId = data.imageId;

	try {
		await dynamo.send(
			new PutCommand({
				TableName: IMAGES_TABLE,
				Item: data,
				ConditionExpression: "attribute_not_exists(imageId)",
			})
		);
		return { success: true };
	} catch (error) {
		console.error("createImage error", error);
		return { error: "Failed to create image" };
	}
}

export async function getImage(imageId: string) {
	await requireSession();
	assertTable();

	if (!imageId) return { error: "imageId is required" };
	try {
		const result = await dynamo.send(
			new GetCommand({
				TableName: IMAGES_TABLE,
				Key: { imageId },
			})
		);
		if (!result.Item) return { error: "Not found" };
		return { success: true, item: result.Item };
	} catch (error) {
		console.error("getImage error", error);
		return { error: "Failed to fetch image" };
	}
}

export async function listImages(limit = 50) {
	await requireSession();
	assertTable();
	try {
		const result = await dynamo.send(
			new ScanCommand({
				TableName: IMAGES_TABLE,
				Limit: limit,
			})
		);
		return { success: true, items: result.Items || [], lastEvaluatedKey: result.LastEvaluatedKey };
	} catch (error) {
		console.error("listImages error", error);
		return { error: "Failed to list images" };
	}
}

export async function updateImage(imageId: string, updates: Record<string, any>) {
	await requireSession();
	assertTable();
	if (!imageId) return { error: "imageId is required" };

	const parsed = UpdateImageSchema.safeParse(updates);
	if (!parsed.success) {
		return { error: parsed.error.issues?.[0]?.message || "Invalid update payload" };
	}

	const clean = Object.fromEntries(
		Object.entries(parsed.data).filter(([, value]) => value !== undefined)
	);

	const keys = Object.keys(clean);
	if (keys.length === 0) return { error: "No fields to update" };

	const expressions = keys.map((key, index) => `#k${index} = :v${index}`);
	const ExpressionAttributeNames = keys.reduce<Record<string, string>>((acc, key, index) => {
		acc[`#k${index}`] = key;
		return acc;
	}, {});
	const ExpressionAttributeValues = keys.reduce<Record<string, any>>((acc, key, index) => {
		acc[`:v${index}`] = clean[key];
		return acc;
	}, {});

	try {
		const result = await dynamo.send(
			new UpdateCommand({
				TableName: IMAGES_TABLE,
				Key: { imageId },
				UpdateExpression: `SET ${expressions.join(", ")}`,
				ExpressionAttributeNames,
				ExpressionAttributeValues,
				ConditionExpression: "attribute_exists(imageId)",
				ReturnValues: "ALL_NEW",
			})
		);
		return { success: true, item: result.Attributes };
	} catch (error) {
		console.error("updateImage error", error);
		return { error: "Failed to update image" };
	}
}

export async function deleteImage(imageId: string) {
	await requireSession();
	assertTable();
	if (!imageId) return { error: "imageId is required" };

	try {
		await dynamo.send(
			new DeleteCommand({
				TableName: IMAGES_TABLE,
				Key: { imageId },
				ConditionExpression: "attribute_exists(imageId)",
			})
		);
		return { success: true };
	} catch (error) {
		console.error("deleteImage error", error);
		return { error: "Failed to delete image" };
	}
}
