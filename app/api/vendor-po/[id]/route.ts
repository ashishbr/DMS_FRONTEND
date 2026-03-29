import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${BACKEND}/api/vendor-po/${params.id}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${BACKEND}/api/vendor-po/${params.id}`, { method: "DELETE" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
