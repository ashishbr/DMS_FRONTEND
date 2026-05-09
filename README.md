# EMB Global DMS Frontend

Enterprise dashboard for the Document Management System. Built with Next.js (App Router) and TypeScript, styled with TailwindCSS and shadcn-inspired primitives, and wired with TanStack Query for data orchestration.

## Login

The app uses frontend-only authentication. Use the credentials below to sign in:

| Field    | Value           |
|----------|-----------------|
| Username | `embadmin`      |
| Password | `emb@admin2026` |

Session persists via `sessionStorage` and clears when the browser tab is closed or the user signs out.

## Features

- **Login page** – Frontend-only auth guard protecting all dashboard routes.
- **Dashboard pulse** – KPI cards, PO utilization trends, document type distribution, exception feed, and alerts.
- **Document inventory** – Filterable table of POs, invoices, and agreements linking to detail views with metadata, validation history, and PDF preview.
- **Client management** – Create, view, and manage client records with document mapping and cache sync.
- **Exception workspace** – Severity-based triage columns with owner assignment indicators and remediation guidance.
- **Alert center** – Manage automation rules for PO caps, expiries, and unlinked invoices with quick actions.
- **Settings** – Configure ingestion integrations, role-based access defaults, and automation thresholds.
- **Conversational assistant** – Floating chatbot widget to answer PO, invoice, and agreement questions.

## Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS + custom shadcn-style UI primitives
- TanStack React Query for client data fetching/hooks
- Recharts for analytics visualisation
- Framer Motion for animations
- React Dropzone & React PDF for uploads/previews
- @dnd-kit for drag-and-drop interactions

## Getting Started

```bash
pnpm install
pnpm dev
```

The project also supports `npm` or `yarn`. Running the dev server starts the dashboard on `http://localhost:3000`.

### Chatbot Lambda integration

The floating assistant can call a lightweight AWS Lambda demo without backend auth. Configure it by setting `NEXT_PUBLIC_LAMBDA_URL` (e.g. via `.env.local`) to the Lambda "Function URL" created with **Auth type = NONE** and CORS origin `*`. Once set, the widget will issue:

```
POST $NEXT_PUBLIC_LAMBDA_URL
Content-Type: application/json
{ "query": "Give me invoice 23247004" }
```

The handler is expected to return `{ "answer": "..." }` (also falls back to `reply`/`message` keys).

## Project Structure

```
app/
  login/          – Login page (frontend-only auth)
  (dashboard)/    – Protected route group (all authenticated pages)
    page.tsx      – Dashboard home
    documents/    – Document inventory
    clients/      – Client management
    exceptions/   – Exception workspace
    alerts/       – Alert center
    settings/     – Settings
  api/            – Mock API routes

components/
  auth/           – AuthGuard (route protection)
  layout/         – AppShell (header, sidebar)
  navigation/     – Sidebar navigation
  ui/             – Base UI primitives (Button, Input, Badge, etc.)
  dashboard/      – Dashboard-specific components
  documents/      – Document feature components
  clients/        – Client feature components
  exceptions/     – Exception feature components
  alerts/         – Alert components
  chat/           – Chatbot widget

lib/
  auth/           – Auth context (login, logout, session)
  data/           – Static sample data
  api.ts          – API utility helpers
  queries.ts      – TanStack Query hooks
```

## Next Steps

1. Replace frontend-only auth with a real identity provider (Auth0, Cognito, etc.).
2. Replace mock API routes with live backend endpoints (`app/api/*`).
3. Tie the upload handler to persistent storage and enrich the ingest queue.
4. Replace the mock chat API with your production LLM service and retrieval pipeline.
5. Export alert rules to backend automation engine.
