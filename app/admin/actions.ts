"use server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand, PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { z } from "zod";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EMAIL_TABLE = process.env.EMAIL_TABLE;

// Helper to check admin access
async function requireAdminAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return null;
  }
  return session;
}

export async function getUsersAction() {
  if (!await requireAdminAccess()) {
    return { error: "Unauthorized: Admin access required." };
  }

  try {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: EMAIL_TABLE,
      })
    );
    return { success: true, users: result.Items || [] };
  } catch (err) {
    console.error("Error fetching users:", err);
    return { error: "Failed to fetch users." };
  }
}

const AddUserSchema = z.object({
  email: z.string().email(),
  isAdmin: z.boolean(),
});

export async function addUserAction(formData: FormData) {
  if (!await requireAdminAccess()) {
    return { error: "Unauthorized: Admin access required." };
  }

  const email = formData.get("email");
  const isAdmin = formData.get("isAdmin") === "on";
  const parsed = AddUserSchema.safeParse({ email, isAdmin });
  if (!parsed.success) {
    return { error: "Invalid input." };
  }
  try {
    await dynamo.send(
      new PutCommand({
        TableName: EMAIL_TABLE,
        Item: { email, isAdmin },
      })
    );
    return { success: true };
  } catch (err) {
    console.error("addUserAction error", err);
    return { error: "Failed to add user." };
  }
}