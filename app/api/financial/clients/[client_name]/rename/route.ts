import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function PATCH(
  req: Request,
  { params }: { params: { client_name: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: "Backend API URL not configured" }, { status: 503 });
  }

  const body = await req.json();
  const encodedName = encodeURIComponent(params.client_name);

  const res = await fetch(
    `${BACKEND_URL}/api/financial/clients/${encodedName}/rename`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
