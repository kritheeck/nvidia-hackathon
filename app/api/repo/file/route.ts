import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js API Route: Proxy for /api/repo/file
 * Forwards requests to the FastAPI backend at port 8000.
 * This avoids Next.js treating "file" as a static resource request.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing 'path' parameter" }, { status: 400 });
  }

  try {
    const backendUrl = `http://127.0.0.1:8000/api/repo/file?path=${encodeURIComponent(path)}`;
    const res = await fetch(backendUrl, { cache: "no-store" });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Backend returned ${res.status}` }));
      return NextResponse.json(err, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: "Backend unreachable", detail: e?.message || String(e) },
      { status: 503 }
    );
  }
}
