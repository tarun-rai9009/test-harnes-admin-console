# Carrier Operations Assistant

Internal Next.js app: an AI-powered carrier operations assistant for non-technical users. Conversation guides users through tasks (e.g. creating a carrier); the app calls your backend and summarizes results in plain language.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** for UI
- Single deployable app — **no separate proxy microservice**; server routes call the Zinnia backend directly from `lib/zinnia`.

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | Routes, layout, global styles |
| `app/api/chat/route.ts` | Server chat endpoint (orchestration entry) |
| `components/` | UI, including enterprise chat shell |
| `lib/ai/` | AI client and prompts |
| `lib/workflows/` | Multi-step flows and field collection |
| `lib/zinnia/` | OAuth (`auth.ts`), REST (`request.ts`, `carriers.ts`, `types.ts`) |
| `lib/session/` | Server-side session / workflow state |
| `types/` | Shared TypeScript types |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `.env.example` to `.env.local` and fill in values.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `ZINNIA_BASE_URL` | REST API origin (e.g. `https://dev.api.zinnia.io`) |
| `ZINNIA_TOKEN_URL` | OAuth token endpoint for client credentials |
| `ZINNIA_CLIENT_ID` / `ZINNIA_CLIENT_SECRET` | OAuth client (server-only) |
| `OPENAI_API_KEY` | OpenAI.com API key (Bearer), or Azure key if using Azure |
| `AZURE_OPENAI_ENDPOINT` | Optional. If set (e.g. `https://resource.openai.azure.com`), chat uses Azure OpenAI |
| `AZURE_OPENAI_DEPLOYMENT` | Optional; Azure deployment id. If omitted, the app calls Azure’s deployments list API and picks a chat deployment (or falls back to `gpt-4o-mini`) |
| `AZURE_OPENAI_API_KEY` | Optional; defaults to `OPENAI_API_KEY` / `AI_API_KEY` for the `api-key` header |
| `AZURE_OPENAI_API_VERSION` | Optional; default `2024-08-01-preview` |

### Configuration and errors

- **Zinnia:** All four Zinnia variables must be set, or carrier/datapoint calls throw and the chat surfaces a user-facing error (no in-memory mocks).
- **AI:** **`isMockMode()`** is true when the AI layer is not configured: no `OPENAI_API_KEY` (or `AI_API_KEY`) for OpenAI.com, or Azure is selected (`AZURE_OPENAI_ENDPOINT` set) but endpoint or API key is missing. Azure deployment can be omitted (auto-discovered).

OAuth tokens are obtained server-side via `POST` to `ZINNIA_TOKEN_URL`, cached in memory until shortly before expiry (`lib/zinnia/auth.ts`). Bearer tokens are never hardcoded.

## Scripts

- `npm run dev` — development (Turbopack)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint

## Status

Chat orchestration is still a stub. **Zinnia** is implemented server-side: OAuth client credentials, in-memory token cache, and typed helpers that call the live API (`createCarrierDraft`, `getCarrierByCode`, `updateCarrier`, `getAllCarriers`, `getDatapoints`). Import from `@/lib/zinnia` only in server code (Route Handlers, Server Actions, `server-only` modules).
