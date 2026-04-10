import { NextResponse } from "next/server";

// Force dynamic rendering - this route should not be statically generated
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/processed-documents/${params.id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `Status ${response.status}`);
      return NextResponse.json(
        { error: `Failed to fetch processed document: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching processed document from backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch processed document" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/processed-documents/${params.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => `Status ${response.status}`);
      return NextResponse.json(
        { error: `Failed to delete processed document: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error deleting processed document from backend:", error);
    return NextResponse.json(
      { error: "Failed to delete processed document" },
      { status: 500 }
    );
  }
}

