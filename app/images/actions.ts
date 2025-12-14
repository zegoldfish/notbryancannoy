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
import type { ImageItem, ImageCreatePayload, ImageUpdatePayload } from "@/app/types";

const ImageSchema = z.object({
	imageId: z.string().min(1, "imageId is required"),
	title: z.string().default(""),
	tags: z.array(z.string()).default([]),
	description: z.string().default(""),
	userId: z.string().min(1, "userId is required"),
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
	const userId = session?.user?.email || session?.user?.name || "";
	if (!session || !userId) {
		throw new Error("Unauthorized: sign in required");
	}
	return { session, userId };
}

export async function createImage(item: ImageCreatePayload) {
	const { userId } = await requireSession();
	assertTable();

	const parsed = ImageSchema.safeParse({ ...item, userId });
	if (!parsed.success) {
		return { error: parsed.error.issues?.[0]?.message || "Invalid image payload" };
	}

	const data = parsed.data;

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
	assertBucket();

	if (!imageId) return { error: "imageId is required" };
	try {
		const result = await dynamo.send(
			new GetCommand({
				TableName: IMAGES_TABLE,
				Key: { imageId },
			})
		);
		if (!result.Item) return { error: "Not found" };
		
		const item = result.Item as ImageItem;
		try {
			const url = await presignImage(imageId);
			return { success: true, item: { ...item, url } };
		} catch (err) {
			console.warn("presign error", err);
			return { success: true, item };
		}
	} catch (error) {
		console.error("getImage error", error);
		return { error: "Failed to fetch image" };
	}
}

export async function listImages(pageSize = 10, startKey?: { imageId: string}) {
	await requireSession();
	assertTable();
	assertBucket();

	const scanCommandInput = {
		TableName: IMAGES_TABLE,
		Limit: pageSize,
		...(startKey ? { ExclusiveStartKey: startKey } : {}),
	}
	try {
		const result = await dynamo.send(
			new ScanCommand(scanCommandInput)
		);

		const items = (result.Items || []) as ImageItem[];
		const withUrls = await Promise.all(
			items.map(async (item) => {
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

export async function updateImage(imageId: string, updates: ImageUpdatePayload) {
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
	const ExpressionAttributeValues = keys.reduce<Record<string, string | string[]>>((acc, key, index) => {
		const value = clean[key as keyof typeof clean];
		acc[`:v${index}`] = value;
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
	const { session, userId } = await requireSession();
	assertTable();
	assertBucket();

	if (!imageId) return { error: "imageId is required" };

	try {
		const lookup = await dynamo.send(
			new GetCommand({
				TableName: IMAGES_TABLE,
				Key: { imageId },
			})
		);
		const item = lookup.Item as ImageItem | undefined;
		if (!item) return { error: "Not found" };
		const isAdmin = !!session.user?.isAdmin;
		if (!isAdmin && item.userId !== userId) {
			return { error: "Unauthorized: you can only delete your own images" };
		}
	} catch (error) {
		console.error("deleteImage lookup error", error);
		return { error: "Failed to verify image ownership" };
	}

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
		const isAdmin = !!session.user?.isAdmin;
		const condition = isAdmin ? "attribute_exists(imageId)" : "attribute_exists(imageId) AND userId = :owner";
		const params = {
			TableName: IMAGES_TABLE,
			Key: { imageId },
			ConditionExpression: condition,
			...(isAdmin ? {} : { ExpressionAttributeValues: { ":owner": userId } }),
		};

		await dynamo.send(new DeleteCommand(params));
		return { success: true };
	} catch (error) {
		console.error("deleteImage dynamo error", error);
		return { error: "Failed to delete metadata" };
	}
}


