import { clearSession } from "@/lib/session/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sessionId =
    typeof (body as { sessionId?: string }).sessionId === "string"
      ? (body as { sessionId: string }).sessionId.trim()
      : "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }
  clearSession(sessionId);
  return NextResponse.json({ ok: true });
}
