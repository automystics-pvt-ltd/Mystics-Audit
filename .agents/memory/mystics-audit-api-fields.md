---
name: Mystics Audit API field mismatches
description: Frontend expected field names that differ from what the API actually returns — caused silent display bugs (undefined, NaN, empty lists).
---

## Pattern: API returns different field names than frontend expects

These mismatches were fixed by using `??` fallbacks (e.g. `d?.lines ?? d?.items ?? []`).

### Inventory Valuation (`/api/inventory/valuation`)
- API returns `lines` (not `items`), `totalItems`, `lowStockItems`
- Per item: `itemCode` (not `sku`), `itemName` (not `name`), `currentQty` (not `currentStock`), `avgCost` (not `averageCost`), `hsnSac` (not `hsnCode`)

### Inventory Detail (`/api/inventory/items/:id`)
- API returns `reorderLevel` (not `minimumStock`), `purchaseRate` (not `averageCost`/`openingCost`), `hsnSac` (not `hsnCode`), `itemCode` (not `sku`)
- No `openingStock` or `openingCost` fields in API — fall back to `currentStock`/`purchaseRate`

### Budget vs Actual (`/api/budgets/:id/vs-actual`)
- API returns `ytdActual` (not `actualSpend`) per line
- Key field: `accountCode` (not `id`)

### Cash Flow (`/api/reports/cash-flow`)
- API returns flat scalar fields: `operatingCashFlow`, `investingCashFlow`, `financingCashFlow`, `netCashChange`, `netProfit`, `adjustments`
- Frontend expected `operating`/`investing`/`financing` arrays — build synthetic line items from the flat fields

### Audit Logs (`/api/audit-logs`)
- Table columns: `user_id`, `user_name`, `user_role`, `action_type`, `entity_type`, `entity_id`, `entity_ref`, `ip_address`, `description`, `timestamp`
- No `changes` column — description goes in `description`; frontend's `l.changes` must be OR'd with `l.description`

### Recent Activity (dashboard)
- Items from multiple entity types (expense, bill, invoice) all have low IDs (1, 2, 3)
- Use composite key `${item.type}-${item.id}` to avoid duplicate React keys

**Why:** The OpenAPI spec and actual API implementation sometimes diverge from what was assumed when building the frontend. Always check the raw API response before assuming field names match the frontend contract.

**How to apply:** When a page shows `undefined`, `NaN`, or empty list despite data existing in the DB, curl the API endpoint directly and compare response fields against what the frontend reads.
