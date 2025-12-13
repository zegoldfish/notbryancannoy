"use server";

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getServerSession } from "next-auth";
import crypto from "node:crypto";

const s3 = new S3Client({});
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
]);

export async function getPresignedPost(fileName: string, fileType: string) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { error: "Unauthorized" };
  }

  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    return { error: "Could not upload file" };
  }

  if (!ALLOWED_TYPES.has(fileType)) {
    return { error: "Unsupported file type" };
  }

  const id = crypto.randomUUID();
  const safeName = fileName.replace(/[^\w.\-]/g, "_");
  const key = `${id}-${safeName}`;

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: bucket,
      Key: key,
      Expires: 600, // 10 minutes
    });

    return {
      success: true,
      url,
      fields,
      key,
      fileName,
    };
  } catch (error) {
    console.error("Upload error:", error);
    return { error: "Failed to generate presigned POST" };
  }
}
