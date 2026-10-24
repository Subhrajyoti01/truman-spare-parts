# Acceptance test cases

Status key: **Not run** means no live database was available during package generation. Execute against a non-production Supabase project.

| # | Test | Expected result | Status |
|---|---|---|---|
| 1 | Add a new part | Part is stored and visible; opening quantity is auditable | Not run end-to-end |
| 2 | Duplicate SKU in same workshop | Database rejects duplicate | Not run end-to-end |
| 3 | Receive positive stock | Stock and receipt movement update atomically | Not run end-to-end |
| 4 | Receive zero/negative quantity | RPC rejects request | Not run end-to-end |
| 5 | Receive unknown SKU | RPC rejects request | Not run end-to-end |
| 6 | Issue against open authorized job | Stock decreases and movement is recorded | Not run end-to-end |
| 7 | Issue against nonexistent job | RPC rejects request | Not run end-to-end |
| 8 | Issue against pending provisional job | RPC rejects request | Not run end-to-end |
| 9 | Issue more than available stock | RPC rejects request; stock unchanged | Not run end-to-end |
| 10 | Concurrent issues competing for last units | Row lock prevents negative stock | Not run end-to-end |
| 11 | Check receipt/issue audit trail | Movement and audit rows exist | Not run end-to-end |
| 12 | Demand 4/day, lead 6, safety 10 | Reorder point is 34 | Formula checked in frontend logic; DB UI not run |
| 13 | Stock equals reorder point | Reorder warning appears | Formula checked in frontend logic; DB UI not run |
| 14 | Stock above reorder point | Warning clears | Formula checked in frontend logic; DB UI not run |
| 15 | Create purchase order | Order persists | Not run end-to-end |
| 16 | Mark order Arrived | Status changes; stock does not change | Not run end-to-end |
| 17 | Receive linked delivery twice | No duplicate receipt beyond remaining order quantity | Not run end-to-end; verify and harden before production |
| 18 | Partial delivery | Received quantity updates; remaining quantity stays outstanding | Not run end-to-end |
| 19 | Non-admin approves provisional card | Database denies approval | Not run end-to-end |
| 20 | User from workshop B queries workshop A | RLS returns no workshop A data | Not run end-to-end |
| 21 | Ordinary staff updates/deletes audit row | No table write policy; operation denied | Not run end-to-end |
| 22 | Export inventory/audit CSV | Download contains displayed records | Manual browser test required |
| 23 | Missing Supabase config | Setup banner appears; no silent success | Manual browser test required |
| 24 | GitHub Pages root loads without build | `index.html` serves static frontend | Deployment not performed |

## Additional pre-production checks

- Review SQL in a staging project; test fresh install and migration/rollback procedures.
- Confirm all RLS policies are unique and correct for your Supabase project.
- Verify membership provisioning is limited to trusted administrators.
- Test order over-receipt, cancellation, repeated receipt submissions and multi-line orders if added.
- Test user roles explicitly; current frontend hides no actions based on roles, so backend permission errors remain authoritative.
- Test mobile layout, keyboard-only navigation, printer behavior and USB/Bluetooth scanner behavior on the actual devices.
