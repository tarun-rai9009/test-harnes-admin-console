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

  const { sessionId, message } = body as ChatApiRequestBody;
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

  try {
    const payload = await handleChatTurn({
      sessionId,
      message,
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
