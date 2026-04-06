import { getAllCarriers } from "@/lib/zinnia/carriers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const carriers = await getAllCarriers();
    return NextResponse.json({ carriers });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to list carriers.",
      },
      { status: 500 },
    );
  }
}
