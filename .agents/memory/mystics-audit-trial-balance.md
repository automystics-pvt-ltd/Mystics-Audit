---
name: Mystics Audit trial balance note
description: Why trial balance shows isBalanced=false and what to do about it
---

## Rule
The trial balance `isBalanced: false` (DR 3,273,810 vs CR 2,409,810 as of July 2026) is a **data issue, not a code bug**. The code logic is correct.

**Why:** Seed data enters opening balances directly on the `accounts.opening_balance` column. The trial balance route correctly includes these in the closing balance calculation, but they have no corresponding counter-entry (e.g., "Opening Equity" CR). This creates an apparent imbalance. All *transaction* journal entries are 100% balanced (confirmed: 0 rows in `journal_entries` where |total_debit - total_credit| > 0.01).

**How to apply:**
- Do NOT try to "fix" the trial balance by changing the route logic.
- If the user reports trial balance imbalance, explain that opening balances need a corresponding "Opening Balance Equity" journal entry to balance the TB.
- The delta equals the sum of all `accounts.opening_balance` values that weren't paired with a balancing journal.
