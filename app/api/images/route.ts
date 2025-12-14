import { NextResponse } from "next/server";
import { listImages } from "@app/images/actions";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageSizeParam = searchParams.get("pageSize");
  const startKeyParam = searchParams.get("startKey");

  const pageSize = pageSizeParam ? Number(pageSizeParam) : 10;
  const startKey = startKeyParam ? { imageId: startKeyParam } : undefined;

  try {
    const result = await listImages(pageSize, startKey);
    // listImages returns either { error } or { success, items, lastEvaluatedKey }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
