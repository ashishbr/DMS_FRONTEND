import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${BACKEND}/api/vendor-po/${params.id}/pdf`);
  if (!res.ok) {
    return NextResponse.json({ error: "PDF not found" }, { status: res.status });
  }
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="${params.id}.pdf"`,
    },
  });
}
