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
import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { z } from "zod";

const ImageSchema = z.object({
	imageId: z.string().min(1, "imageId is required"),
	title: z.string().default(""),
	tags: z.array(z.string()).default([]),
	description: z.string().default(""),
});

const UpdateImageSchema = z.object({
	title: z.string().optional(),
	tags: z.array(z.string()).optional(),
	description: z.string().optional(),
});

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const IMAGES_TABLE = process.env.IMAGES_TABLE;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Simple in-memory cache for presigned URLs, keyed by S3 object key.
// This lives for the lifetime of the server process and avoids repeated presigning.
const presignCache: Map<string, { url: string; expiresAt: number }> = new Map();

function assertTable() {
	if (!IMAGES_TABLE) {
		throw new Error("IMAGES_TABLE is not configured");
	}
}

function assertBucket() {
	if (!S3_BUCKET_NAME) {
		throw new Error("S3_BUCKET_NAME is not configured");
	}
}

async function presignImage(key: string, expiresIn = 900) {
	assertBucket();
	const now = Date.now();
	const cached = presignCache.get(key);
	if (cached && cached.expiresAt > now + 1000) {
		return cached.url;
	}

	const command = new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key });
	const url = await getSignedUrl(s3, command, { expiresIn });
	// Cache a bit shorter than actual expiry to be safe (subtract 2 seconds)
	const expiresAt = now + (expiresIn * 1000) - 2000;
	presignCache.set(key, { url, expiresAt });
	return url;
}

async function requireSession() {
	const session = await getServerSession(authOptions);
	if (!session) {
		throw new Error("Unauthorized: sign in required");
	}
}

async function requireAdmin() {
	const session = await getServerSession(authOptions);
	if (!session?.user?.isAdmin) {
		throw new Error("Unauthorized: admin access required");
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
	assertBucket();
	try {
		const result = await dynamo.send(
			new ScanCommand({
				TableName: IMAGES_TABLE,
				Limit: limit,
			})
		);

		const items = result.Items || [];
		const withUrls = await Promise.all(
			items.map(async (item: any) => {
				if (!item?.imageId) return item;
				try {
					const url = await presignImage(item.imageId);
					return { ...item, url };
				} catch (err) {
					console.warn("presign error", err);
					return item;
				}
			})
		);

		return { success: true, items: withUrls, lastEvaluatedKey: result.LastEvaluatedKey };
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
	await requireAdmin();
	assertTable();
	assertBucket();

	if (!imageId) return { error: "imageId is required" };

	try {
		await s3.send(
			new DeleteObjectCommand({
				Bucket: S3_BUCKET_NAME,
				Key: imageId,
			})
		);
	} catch (error) {
		console.error("deleteImage s3 error", error);
		return { error: "Failed to delete file" };
	}

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
		console.error("deleteImage dynamo error", error);
		return { error: "Failed to delete metadata" };
	}
}


