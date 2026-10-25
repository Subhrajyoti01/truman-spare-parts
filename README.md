# TEAM TRUMAN — Spare Parts Inventory Management System

A static HTML/CSS/vanilla-JavaScript workshop inventory frontend using Supabase Auth and PostgreSQL. Designed for GitHub Pages: no Node.js build step is required. This is a starter implementation; configure and test it with a non-production workshop before real service-centre use.

## Included features

- Supabase email/password authentication, sign-out and password-reset flow.
- Responsive dashboard with database-derived inventory, valuation, reorder, job-card, exception and order metrics.
- Workshop-scoped parts master with SKU uniqueness, generated Code 128 printable barcode labels, CSV export and ABC/XYZ fields.
- Atomic database RPCs for stock receipts and issues, with stock movement and audit events.
- Job cards with administrator-only provisional approval/rejection.
- Stock-out exception tracking and resolution.
- Reorder planner using `CEIL((average daily demand × lead time) + safety stock)` and outstanding order quantities.
- Incoming purchase orders, mark-arrived workflow, and linked receipt workflow. Marking arrived does not change stock.
- Read-only audit log and CSV export.
- Role checks and RLS scoped to workshop membership.

## Setup in 10 minutes

1. Create a Supabase project at https://supabase.com/ and note its project URL and public anon/publishable key.
2. In Supabase → SQL Editor, run all of `schema.sql` as project owner. If you are rerunning after partial setup, inspect existing policies first; policy creation statements are not intended to be repeatedly run without cleanup.
3. Create your first user using the app's Create account option. Find that user's UUID in Supabase → Authentication → Users.
4. As project owner, run this once in SQL Editor after replacing placeholders:

   ```sql
   select public.bootstrap_first_workshop('AUTH-USER-UUID-HERE', 'Team Truman Workshop');
   ```

   The function is revoked from browser roles. It only works while there are no workshop memberships. For later staff, create their Auth account and add a membership as a trusted project owner/admin process, for example:

   ```sql
   insert into public.workshop_memberships(workshop_id, user_id, role)
   values ('WORKSHOP-UUID-HERE', 'STAFF-AUTH-USER-UUID-HERE', 'storekeeper');
   ```

   Allowed roles: `workshop_admin`, `inventory_manager`, `storekeeper`, `technician`, `auditor`. Never accept a role from an untrusted browser form.
5. Edit `config.js`; replace `https://YOUR-PROJECT.supabase.co` and `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`. These are public browser settings. Never use a service-role key in frontend code or GitHub.
6. Open `index.html` locally to smoke-test, or deploy using `DEPLOYMENT.md`.
7. Register parts, create job cards, and test receipts/issues with non-production data before operational use.

## Reorder formula

`Reorder Point = CEIL((Average Daily Demand × Supplier Lead Time in Days) + Safety Stock)`

A part is flagged at stock less than or equal to the calculated threshold. Suggested order quantity uses `max(0, target stock − current stock − outstanding quantity)` when a target is configured; otherwise it uses the provisional `max(1, 2 × reorder point − current stock − outstanding quantity)`. Minimum order quantity is respected when a positive order is suggested. Review suggestions before ordering.

ABC is staff-assigned in this version; the UI does not pretend to calculate value classifications without historical usage. XYZ is staff-assigned based on demand predictability. Historical demand classification is a future enhancement.

## Important limitations and security notes

- This project has not been connected to your Supabase instance or deployed to GitHub Pages from this environment. No credentials are included.
- Browser libraries load from jsDelivr CDN; online access is needed. Barcode scanning supports USB/Bluetooth scanners that type into the focused SKU field. Camera scanning is not implemented.
- The SQL is a coherent starter schema but must be reviewed by a Supabase/PostgreSQL developer before production use. Test policies, concurrent operations, role membership management, partial receipts and all workflow permissions in your own project.
- Bootstrap is deliberately owner-only; staff invitation/membership management is documented as a trusted administrative SQL step rather than an insecure public self-service role form.
- The schema includes a single active workshop selection per user for this starter. If a user belongs to multiple workshops, adapt `current_workshop_id()` and add a deliberate workshop selector/session model.
- Receipt/order linkage supports partial quantities at the database level, but the frontend is intentionally simple; staff must verify each actual delivery and should not receive beyond remaining quantity on a purchase order.
- Stock adjustment is not exposed as a casual edit field. Add a reviewed, reason-required adjustment RPC before operational use.
- This project is not an official Mercedes-Benz application and does not use protected manufacturer logos.

## Files

See `DEPLOYMENT.md` for GitHub Pages instructions and `tests/` for test cases and what has/has not been executed.


## Feature update migration
For an existing Supabase database, run only the new `admin_delete_part` function/grant block at the end of the updated `schema.sql` in SQL Editor. Do not blindly rerun the whole original schema. Push the updated frontend files to GitHub. Camera scanning uses the browser BarcodeDetector API; support varies and camera permission is required on HTTPS. Batch barcode labels are saved in this browser only, not synced between devices.
