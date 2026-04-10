import { NextResponse } from "next/server";

// Force dynamic rendering - this route should not be statically generated
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET() {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/processed-documents/`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
      throw new Error(`Backend API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching processed documents from backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch processed documents" },
      { status: 500 }
    );
  }
}

