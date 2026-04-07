import { getDatapoints } from "@/lib/zinnia/carriers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dp = await getDatapoints();
    return NextResponse.json({
      referenceByKey: dp.referenceByKey,
      items: dp.items,
      totalCount: dp.totalCount,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to load datapoints.",
      },
      { status: 500 },
    );
  }
}
