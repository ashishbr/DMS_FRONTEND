import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function POST() {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Backend API URL not configured" }, { status: 503 });
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/uploads/sync-cache-to-db`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("sync-cache-to-db error:", err);
    return NextResponse.json({ error: "Failed to sync cache to DB" }, { status: 500 });
  }
}
