import { handleChatTurn } from "@/lib/chat/handle-turn";
import { logWorkflowErrorServerSide } from "@/lib/chat/workflow-errors";
import { NextResponse } from "next/server";
import type { ChatApiRequestBody } from "@/types/chat-assistant";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const {
    sessionId,
    message,
    createCarrierDraftForm,
    updateCarrierCode,
    updateCarrierCategoryId,
    updateCarrierCategoryIds,
    updateCarrierSectionForm,
    updateCarrierNavigate,
  } = body as ChatApiRequestBody;
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 },
    );
  }
  if (typeof message !== "string") {
    return NextResponse.json(
      { error: "message must be a string" },
      { status: 400 },
    );
  }
  if (
    createCarrierDraftForm !== undefined &&
    createCarrierDraftForm !== null &&
    (typeof createCarrierDraftForm !== "object" || Array.isArray(createCarrierDraftForm))
  ) {
    return NextResponse.json(
      { error: "createCarrierDraftForm must be a plain object when provided" },
      { status: 400 },
    );
  }
  if (
    updateCarrierCode !== undefined &&
    updateCarrierCode !== null &&
    typeof updateCarrierCode !== "string"
  ) {
    return NextResponse.json(
      { error: "updateCarrierCode must be a string when provided" },
      { status: 400 },
    );
  }
  if (
    updateCarrierCategoryId !== undefined &&
    updateCarrierCategoryId !== null &&
    typeof updateCarrierCategoryId !== "string"
  ) {
    return NextResponse.json(
      { error: "updateCarrierCategoryId must be a string when provided" },
      { status: 400 },
    );
  }
  if (updateCarrierCategoryIds !== undefined && updateCarrierCategoryIds !== null) {
    if (!Array.isArray(updateCarrierCategoryIds)) {
      return NextResponse.json(
        { error: "updateCarrierCategoryIds must be an array when provided" },
        { status: 400 },
      );
    }
    for (const id of updateCarrierCategoryIds) {
      if (typeof id !== "string") {
        return NextResponse.json(
          { error: "updateCarrierCategoryIds must be an array of strings" },
          { status: 400 },
        );
      }
    }
  }
  if (
    updateCarrierSectionForm !== undefined &&
    updateCarrierSectionForm !== null &&
    (typeof updateCarrierSectionForm !== "object" ||
      Array.isArray(updateCarrierSectionForm))
  ) {
    return NextResponse.json(
      { error: "updateCarrierSectionForm must be a plain object when provided" },
      { status: 400 },
    );
  }
  if (
    updateCarrierNavigate !== undefined &&
    updateCarrierNavigate !== null &&
    updateCarrierNavigate !== "back_carrier_code" &&
    updateCarrierNavigate !== "back_categories"
  ) {
    return NextResponse.json(
      { error: "updateCarrierNavigate must be back_carrier_code or back_categories" },
      { status: 400 },
    );
  }

  try {
    const payload = await handleChatTurn({
      sessionId,
      message,
      createCarrierDraftForm,
      updateCarrierCode,
      updateCarrierCategoryId,
      updateCarrierCategoryIds,
      updateCarrierSectionForm,
      updateCarrierNavigate,
    });
    return NextResponse.json(payload);
  } catch (e) {
    logWorkflowErrorServerSide(e, { workflowId: "api_chat_route" });
    return NextResponse.json(
      {
        error: "Chat handler failed",
        responseType: "error" as const,
        message:
          "Something went wrong on our side. Please try again in a moment.",
        awaitingConfirmation: false,
        workflowId: null,
        workflowName: null,
      },
      { status: 500 },
    );
  }
}
