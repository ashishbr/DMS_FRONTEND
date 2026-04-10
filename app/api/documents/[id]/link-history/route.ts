import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/documents/${params.id}/link-history`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch link history" }, { status: 500 });
  }
}
