import {
  buildCreateDraftPayload,
  mergeCreateCarrierDraftFormIntoCollected,
} from "@/lib/workflows/create-carrier-draft-form-utils";
import { validateCreateCarrierDraftMerged } from "@/lib/workflows/create-carrier-draft-validate";
import { createCarrierDraft } from "@/lib/zinnia/carriers";
import { parseZinniaCreateDraftErrorBody } from "@/lib/zinnia/parse-create-draft-errors";
import { ZinniaApiError } from "@/lib/zinnia/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const values =
    body &&
    typeof body === "object" &&
    body !== null &&
    "values" in body &&
    typeof (body as { values: unknown }).values === "object" &&
    (body as { values: unknown }).values !== null &&
    !Array.isArray((body as { values: unknown }).values)
      ? ((body as { values: Record<string, unknown> }).values as Record<
          string,
          unknown
        >)
      : null;
  if (!values) {
    return NextResponse.json(
      { error: "Body must include values object" },
      { status: 400 },
    );
  }

  const merged = mergeCreateCarrierDraftFormIntoCollected({}, values);
  const vr = validateCreateCarrierDraftMerged(merged);
  if (!vr.ok) {
    return NextResponse.json(
      {
        ok: false as const,
        fieldErrors: vr.errors,
        formLevelMessage: "Fix the highlighted fields.",
      },
      { status: 400 },
    );
  }

  try {
    const payload = buildCreateDraftPayload(merged);
    const carrier = await createCarrierDraft(payload);
    return NextResponse.json({ ok: true as const, carrier });
  } catch (e) {
    if (e instanceof ZinniaApiError) {
      const { fieldErrors, formLevelMessage } =
        parseZinniaCreateDraftErrorBody(e.bodyText);
      const headline =
        formLevelMessage ??
        (Object.keys(fieldErrors).length > 0
          ? "Check the form for field errors."
          : e.message);
      return NextResponse.json(
        {
          ok: false as const,
          fieldErrors,
          formLevelMessage:
            Object.keys(fieldErrors).length === 0
              ? (formLevelMessage ?? headline)
              : formLevelMessage,
          message: headline,
        },
        { status: e.status >= 400 && e.status < 600 ? e.status : 502 },
      );
    }
    return NextResponse.json(
      {
        ok: false as const,
        formLevelMessage:
          e instanceof Error ? e.message : "Create draft failed.",
      },
      { status: 500 },
    );
  }
}
