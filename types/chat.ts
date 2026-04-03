/**
 * Shared types for chat API and UI.
 */

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type ChatRequestBody = {
  messages: ChatMessage[];
};

export type ChatResponseBody = {
  message: ChatMessage;
};
