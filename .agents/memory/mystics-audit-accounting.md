---
name: Mystics Audit accounting engine
description: Double-entry journal wiring, GL account codes, normalBalance fix, and accounting helper patterns
---

## normalBalance case — critical
DB stores lowercase "debit"/"credit" for all accounts. Always compare with `.toLowerCase() === "debit"`. The `accounts.ts` route uses `isDebitNormal(normalBalance)` helper. Bank auto-create (`bank.ts`) inserts `normalBalance: "debit"` (lowercase).

## Accounting helper
`artifacts/api-server/src/utils/accounting.ts` exports `createPostedJournal({ voucherPrefix, date, narration, lines })` and `round2(n)`. This creates a balanced, immediately-posted journal entry. Throws if any account code is missing or if |DR - CR| ≥ 0.01.

## GL Account Codes (canonical)
| Code | Name | Type | Normal |
|------|------|------|--------|
| 1000 | Cash in Hand | Asset | debit |
| 1010-1012 | Bank accounts (HDFC/SBI/ICICI) | Asset | debit |
| 1100 | Accounts Receivable | Asset | debit |
| 1150 | TDS Receivable | Asset | debit |
| 1200 | Inventory | Asset | debit |
| 1400 | GST Input Tax Credit | Asset | debit |
| 3000 | Accounts Payable | Liability | credit |
| 3100 | GST Payable - CGST | Liability | credit |
| 3110 | GST Payable - SGST | Liability | credit |
| 3120 | GST Payable - IGST | Liability | credit |
| 3200 | TDS Payable | Liability | credit |
| 5500 | Purchases | Expense | debit |
| 6000 | Revenue from IT Services | Income | credit |
| 7040 | Discount Allowed | Expense | debit |

## Journal patterns per transaction

**Invoice post** (INV prefix):
- DR 1100 (AR) = totalAmount
- CR 6000 (Revenue) = taxableAmount
- CR 3100/3110 (CGST/SGST) = if intra-state
- CR 3120 (IGST) = if inter-state

**Receipt creation** (RCT prefix):
- DR bank GL account = netAmount
- DR 1150 (TDS Receivable) = tdsDeducted (if > 0)
- DR 7040 (Discount Allowed) = settlementDiscount (if > 0)
- CR 1100 (AR) = grossAmount

**Bill post** (BILL prefix):
- DR 5500 (Purchases) = taxableAmount
- DR 1400 (GST ITC) = cgst + sgst + igst
- CR 3000 (AP) = totalAmount

**Bill payment** (PMT prefix):
- DR 3000 (AP) = payAmount
- CR bank GL = payAmount - tdsDeducted
- CR 3200 (TDS Payable) = tdsDeducted (if > 0)

## Inter-state GST
Company state fetched from `companiesTable` (`getCompanyState()` helper). Company is in **Maharashtra**. `isInterState = placeOfSupply.toLowerCase() !== companyState.toLowerCase()`. Old code hardcoded "Maharashtra" in bills (always CGST+SGST) — fixed.

## Sequence numbers (invoice/receipt/bill)
In-memory counters initialized from DB max on first call to avoid collisions after server restart. Pattern: `if (seq === 0) { query DB for last number; parse and set seq }`.

## Trial balance
Correctly aggregates opening balances + all posted journal_lines per account. Debit-normal accounts: `opening + txDebit - txCredit`. Credit-normal: `opening + txCredit - txDebit`. In trial balance columns: debit-normal positive balance → Debit column; negative → Credit.

**Why:** Opening balances from seed data are unbalanced (test data) so trial balance shows "Unbalanced" — this is expected for demo data, not a bug.
