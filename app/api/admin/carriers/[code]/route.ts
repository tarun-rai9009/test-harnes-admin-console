import { carrierGetResponseToCollectedParams } from "@/lib/admin/carrier-get-response-to-collected";
import { getWorkflowDefinition } from "@/lib/workflows/definitions/registry";
import {
  updatePayloadHasBody,
} from "@/lib/workflows/definitions/update-carrier-payload";
import { isUpdateCategoryId } from "@/lib/workflows/update-carrier-section-form";
import { validateCarrierCode } from "@/lib/workflows/validators";
import { deleteCarrier, getCarrierByCode } from "@/lib/zinnia/carriers";
import { formatChatWorkflowError } from "@/lib/zinnia/workflow-user-errors";
import { parseZinniaUpdateCarrierErrorBody } from "@/lib/zinnia/parse-update-carrier-errors";
import { ZinniaApiError } from "@/lib/zinnia/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type PutBody = {
  updateCategory?: string;
  /** When set (non-empty, all valid ids), builds one merged PUT body for all listed sections. */
  updateCategories?: string[];
  collectedParams?: Record<string, unknown>;
};

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const codeVal = validateCarrierCode(raw);
  if (!codeVal.ok) {
    return NextResponse.json(
      { error: codeVal.error },
      { status: 400 },
    );
  }
  try {
    const carrier = await getCarrierByCode(String(codeVal.normalized));
    const collected = carrierGetResponseToCollectedParams(carrier);
    return NextResponse.json({ carrier, collected });
  } catch (e) {
    if (e instanceof ZinniaApiError) {
      return NextResponse.json(
        { error: e.message, bodyText: e.bodyText },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const codeVal = validateCarrierCode(raw);
  if (!codeVal.ok) {
    return NextResponse.json(
      { error: codeVal.error },
      { status: 400 },
    );
  }
  const urlCode = String(codeVal.normalized);
  const data: Record<string, unknown> = { carrierCode: urlCode };
  try {
    await deleteCarrier(urlCode);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof ZinniaApiError) {
      return NextResponse.json(
        {
          error: formatChatWorkflowError(e, undefined, data),
          bodyText: e.bodyText,
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    return NextResponse.json(
      { error: formatChatWorkflowError(e, undefined, data) },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await ctx.params;
  const codeVal = validateCarrierCode(raw);
  if (!codeVal.ok) {
    return NextResponse.json({ error: codeVal.error }, { status: 400 });
  }
  const urlCode = String(codeVal.normalized);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { updateCategory, updateCategories, collectedParams } =
    (body ?? {}) as PutBody;
  if (
    !collectedParams ||
    typeof collectedParams !== "object" ||
    Array.isArray(collectedParams)
  ) {
    return NextResponse.json(
      { error: "collectedParams must be an object" },
      { status: 400 },
    );
  }

  const multiOk =
    Array.isArray(updateCategories) &&
    updateCategories.length > 0 &&
    updateCategories.every(
      (x) => typeof x === "string" && isUpdateCategoryId(x),
    );

  let data: Record<string, unknown>;
  if (multiOk) {
    data = {
      ...collectedParams,
      carrierCode: urlCode,
      updateCategories,
    };
  } else if (
    typeof updateCategory === "string" &&
    isUpdateCategoryId(updateCategory)
  ) {
    data = {
      ...collectedParams,
      carrierCode: urlCode,
      updateCategory,
    };
  } else {
    return NextResponse.json(
      {
        error:
          "Invalid or missing update payload: send updateCategory (one section) or updateCategories (non-empty array of section ids).",
      },
      { status: 400 },
    );
  }

  const def = getWorkflowDefinition("update_carrier");
  if (!def) {
    return NextResponse.json(
      { error: "Update workflow unavailable" },
      { status: 500 },
    );
  }

  const built = def.buildPayload(data) as {
    carrierCode: string;
    putPayload: unknown;
  };
  if (built.carrierCode.toUpperCase() !== urlCode) {
    return NextResponse.json(
      { error: "carrierCode mismatch" },
      { status: 400 },
    );
  }
  if (!updatePayloadHasBody(built.putPayload as never)) {
    return NextResponse.json(
      { error: "No update fields were provided." },
      { status: 400 },
    );
  }

  try {
    const result = await def.execute(built);
    return NextResponse.json({ ok: true as const, carrier: result });
  } catch (e) {
    const defForErr = def;
    if (e instanceof ZinniaApiError) {
      const p = parseZinniaUpdateCarrierErrorBody(e.bodyText);
      return NextResponse.json(
        {
          ok: false as const,
          fieldErrors: p.fieldErrors,
          ...(p.rowFieldErrors ? { rowFieldErrors: p.rowFieldErrors } : {}),
          formLevelMessage:
            p.formLevelMessage ??
            formatChatWorkflowError(e, defForErr, data),
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    return NextResponse.json(
      {
        ok: false as const,
        formLevelMessage: formatChatWorkflowError(e, defForErr, data),
      },
      { status: 500 },
    );
  }
}
