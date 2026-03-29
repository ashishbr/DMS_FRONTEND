import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { search } = new URL(req.url);
  const res = await fetch(`${BACKEND}/api/vendor-po${search}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(`${BACKEND}/api/vendor-po`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
