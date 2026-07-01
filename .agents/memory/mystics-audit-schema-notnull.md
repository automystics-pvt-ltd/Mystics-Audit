---
name: Mystics Audit schema NOT NULL pitfalls
description: Fields that are NOT NULL in DB but easy to omit from API callers, causing silent 500s
---

## Rule
Any route inserting into `invoice_lines` or `bill_lines` MUST default `hsnSac` to `""` (empty string) when the caller omits it — the column is `NOT NULL` with no DB default.
Any route inserting into `documents` MUST default `originalName` to `name` (or `"Untitled"`) — `originalName` is `NOT NULL`.

**Why:** The DB rejects the INSERT with a constraint error and the route returns `{"error":"Failed to create invoice"}` / `{"error":"..."}` with no obvious field name in the message. Took several debug cycles to identify the culprit.

**How to apply:**
- `invoices.ts`: `hsnSac: l.hsnSac || ""`
- `bills.ts`: `hsnSac: l.hsnSac || ""`
- `documents.ts`: `originalName: b.originalName || b.name || "Untitled"`

When adding new tables, always scan for `notNull()` columns without `.default()` and add route-level fallbacks.
