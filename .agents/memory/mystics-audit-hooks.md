---
name: Mystics Audit Orval hook conventions
description: Hook naming, param types, and TypeScript pitfalls for the Mystics Audit project
---

## Rule: Hook names follow Orval naming exactly

Generated hooks live in `lib/api-client-react/src/generated/api.ts`. Always grep for the exact name — do NOT invent names like `useListInventory`; the real hook is `useListItems`.

Inventory: `useListItems` / `useGetItem` / `useCreateItem` / `getListItemsQueryKey`
GST: `useGetGstr1Data` / `useGetGstr3bData` (not useGetGstr1 / useGetGstr3b)
GST filing: No `useFileGstr` exists — GST filing UI only (no POST endpoint generated)
Query key helpers: `getGetXxxQueryKey(id)` for detail, `getListXxxQueryKey(params?)` for list

**Why:** Orval auto-generates names from OpenAPI operationId. They don't always match intuitive names.

## Rule: Param type fields are strict — check api.schemas.ts

- `ListVendorsParams.isMsme: boolean` (not string "true")
- `ListItemsParams.lowStock: boolean` (not string)
- `GetGstr1DataParams.period: string` (e.g. "2025-06") — NOT month/year separately
- `GetGstr3bDataParams.period: string` — same
- `GetGstReconciliationParams.period: string` — same
- `ListAuditLogsParams`: fields are `entityType`, `actionType`, `userId`, `from`, `to` — NOT `module`/`action`

**Why:** TypeScript strict-checks params against the generated type — wrong field names cause TS2353.

## Rule: Never pass `{ query: { enabled: !!id } }` to Orval hooks

TQ v5's `UseQueryOptions` requires `queryKey` in the type, so passing `{ enabled: boolean }` causes TS2741. Since detail page `id` from `useParams` is always defined when the route renders, just call hooks unconditionally and add a null guard on the data instead.

**How to apply:** On detail pages, call `useGetXxx(Number(id))` with no options. Add `if (!data) return <Loading />` to handle initial fetch.

## Rule: useForm setValue type is narrow by default

If `defaultValues` only lists some fields, `setValue("otherField", ...)` fails TS. Fix: either include ALL fields in `defaultValues`, OR use plain `useState` for the form state (often cleaner for many-field forms).

**Why:** React Hook Form infers form field type from defaultValues.

## Mutation pattern

```ts
mutation.mutate({ data: { ...fields } } as any, {
  onSuccess: () => { qc.invalidateQueries({ queryKey: getListXxxQueryKey() }); navigate("/path"); },
});
```

The `as any` is needed because Orval body types are strict but server accepts partial data.
