# Mystics Audit

A **multi-tenant enterprise cloud SaaS** platform for **IT services, software development, SaaS product, and software consulting businesses** in India. Covers finance, compliance (GST/TDS), operations, and a practice audit workspace — optimised for service-oriented companies, not retail or manufacturing.

**Primary verticals:** Software development · IT consulting · SaaS companies · AMC/support · Software licensing · Cloud/hosting services

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, path /api)
- `pnpm --filter @workspace/mystics-audit run dev` — run the frontend (port 24759, path /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + shadcn/ui + wouter + TanStack Query + recharts
- API: Express 5 with Orval-generated client
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mystics-audit/` — React frontend (all 15 modules' pages)
- `artifacts/api-server/` — Express API server with all routes
- `lib/api-spec/` — OpenAPI spec (source of truth for all API contracts)
- `lib/api-client-react/src/generated/` — Orval-generated hooks (`api.ts`) and schemas (`api.schemas.ts`)
- `lib/db/src/schema/` — Drizzle ORM schema (all 15 tables)
- `artifacts/mystics-audit/src/App.tsx` — wouter routes for all pages
- `artifacts/mystics-audit/src/components/Layout.tsx` — sidebar nav

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React hooks + Zod schemas. Never write API clients by hand.
- All hook imports from `@workspace/api-client-react` only. Hook naming follows Orval: `useListItems` not `useListInventory`.
- Mutation pattern: `mutation.mutate({ data: {...} } as any, { onSuccess: () => {...} })`.
- GST params use `period: string` (e.g. "2025-06"), not `month`/`year` separately.
- ListItemsParams.lowStock is `boolean`; ListVendorsParams.isMsme is `boolean` — not string "true".
- ListAuditLogsParams uses `entityType`/`actionType` (not `module`/`action`).
- Detail pages call hooks without `{ query: { enabled } }` — id from useParams is always defined when route renders.

## Product — 15 Modules

1. **Dashboard** — KPIs, revenue/expense chart, cash position, aging summaries, GST status
2. **Chart of Accounts / GL** — Account hierarchy, trial balance, ledger view
3. **Invoicing** — Create/edit invoices with GST line items, post, PDF-ready
4. **GST Management** — GSTR-1, GSTR-3B, ITC Ledger, Reconciliation
5. **AR (Accounts Receivable)** — Customer list, AR Aging, receipt recording
6. **AP (Accounts Payable)** — Vendor list, bill entry with MSME/TDS, AP Aging
7. **Bank & Cash** — Bank accounts, transactions, reconciliation
8. **Expense Management** — Claims, policy enforcement, approval workflow
9. **Purchase Management** — Software licenses, SaaS subscriptions, cloud services, IT tools, API services (NOT physical goods)
10. **Inventory** — Digital asset / license tracking (software seats, domains, SSL certs) — not physical stock
11. **Financial Reports** — P&L, Balance Sheet, Cash Flow, Day Book
12. **Audit Trail** — Tamper-evident log of all actions with entityType/actionType filters
13. **Budget Management** — Budget creation with account lines, vs-actual with bar charts
14. **User Management / RBAC** — User list, create, activate/suspend, permissions by module
15. **Settings** — Company setup, Chart of Accounts management

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing frontend pages.
- Do NOT use `pnpm dev` at workspace root — individual workflows handle this.
- All hooks must be imported from `@workspace/api-client-react`, not from `@workspace/api-client`.
- Do NOT pass `{ query: { enabled: !!id } }` to Orval hooks — the TQ v5 `UseQueryOptions` type requires `queryKey` which causes TS2741. Just call the hook unconditionally on detail pages.
- When using `useForm`, include all fields in `defaultValues` or the form type won't allow `setValue` for fields not in defaults. Alternatively, use uncontrolled state (`useState`) for forms with many dynamic fields.

## Business Scope (from product direction doc)

Target customer: IT services / software / SaaS / consulting companies — NOT retail, manufacturing, or physical goods.

**In scope for procurement:** Software licenses · SaaS subscriptions · Cloud services · Dev tools · API services · Hosting & infrastructure · IT consulting · Digital assets · Security software
**Out of scope:** Physical products, hardware, shipping, retail inventory

**Future modules (not yet built):**
- Project Management & SDLC tracking
- CRM — Leads, Opportunities, Proposals, Contracts
- Resource & Employee Management
- Time Tracking & Timesheets
- Support & Helpdesk
- SaaS Subscription Management (multi-tenant billing)

All UI labels, workflows, and terminology must reflect IT/service operations. Architecture must support multi-tenancy and future vertical expansion without major rewrites.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
