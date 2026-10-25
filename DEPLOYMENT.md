# Deployment: GitHub Pages + Supabase

## A. Configure the database

1. Create a Supabase project and choose a strong database password.
2. Open SQL Editor and execute `schema.sql`.
3. Create the first user from the website after deployment, or via Supabase Auth.
4. Copy the user's Auth UUID. Run the one-time bootstrap call from README as the project owner. Never make the bootstrap function executable by `anon` or `authenticated`.
5. Add other staff to Auth, then create `workshop_memberships` rows from trusted admin SQL with the correct workshop UUID and role.
6. Test RLS using at least two users, including a user from a different workshop.

## B. Configure the frontend

1. Extract `truman-spare-parts-github.zip`.
2. Open `config.js` in a text editor.
3. Replace the Supabase URL and public anon/publishable key. Do not paste a service-role key.
4. Save the file. The repository root should contain `index.html`, `config.js`, `schema.sql`, and this document.

## C. Upload to GitHub

1. Sign in to https://github.com/ or create an account.
2. Create a repository named `truman-spare-parts`.
3. Choose public or private according to your needs. GitHub Pages availability/settings depend on repository and plan; verify the current GitHub plan restrictions.
4. Use **Add file → Upload files** and upload the *contents* of the extracted project folder, not the parent folder itself. `index.html` must be at repository root.
5. Commit the files to branch `main`.

## D. Enable Pages

1. In the repository, open **Settings → Pages**.
2. Under build and deployment, select **Deploy from a branch**.
3. Choose branch `main` and folder `/(root)`, then Save.
4. Wait for the deployment to finish. GitHub displays the published URL on the Pages settings page, typically `https://YOUR-USERNAME.github.io/truman-spare-parts/`.
5. Open the published URL and confirm the login screen appears.

## E. Configure Supabase Auth URLs

In Supabase → Authentication → URL Configuration, set the Site URL to your published Pages URL and add that URL to the allowed redirect URLs. This is needed for password reset links and may be needed for email confirmation.

### Password reset (important)
The app now detects a password-recovery callback and displays a **Choose a new password** form instead of opening the inventory dashboard. The user must enter and confirm the new password and select **Save new password**; the app calls Supabase `auth.updateUser({ password })`, signs out, and returns to sign-in.

For GitHub Pages, use the exact deployed URL. For example, if your repository is `truman-spare-parts` under `subhrajyoti01`, set Site URL to `https://subhrajyoti01.github.io/truman-spare-parts/` and add that same URL under **Redirect URLs**. Do not use `http://localhost:...`. If your repository name or username differs, use your actual published URL instead.

To test: open the deployed website, enter the account email, click **Reset password**, open the newest email, and follow its link. The page should show **Choose a new password**. Save the new password, then sign in with it. If the link reports expired/invalid, request a fresh email and open the newest message. Make sure Supabase's recovery email template links through Supabase's verification URL and does not hard-code localhost.

## F. Verify persistence

1. Sign in using a user with an active workshop membership.
2. Create a test part and confirm it appears after refreshing.
3. Receive a test quantity and check the stock movement/audit log.
4. Create an open job card and issue stock against the matching technician and job number.
5. Create a provisional job card and verify it cannot be used to issue until an administrator approves it.
6. Create an order, mark it arrived, and verify inventory did not change. Then receive it through **Add to stock** and verify stock increases only after the receipt.
7. Test with a second workshop user to verify isolation.

## Troubleshooting

- **Setup required banner:** `config.js` still has placeholder values or has a typo.
- **Invalid API key / network errors:** copy the project URL and public anon/publishable key from Supabase project settings.
- **Permission denied / no workshop membership:** verify the user's Auth UUID, active membership, workshop ID, and role.
- **Database function not found:** run `schema.sql` and check the function signature and grants.
- **Duplicate SKU/order/job number:** those identifiers must be unique within the workshop.
- **Password reset not received:** check spam, Auth email settings and allowed redirect URLs.
- **Barcode library missing:** check network access to jsDelivr; the barcode library is loaded from a CDN.
- **Pages shows 404:** ensure `index.html` is at repository root, branch is `main`, folder is `/(root)`, and deployment completed.
- **RLS errors:** do not disable RLS as a workaround. Review policies and membership records.

GitHub Pages hosts only static frontend files. Supabase remains the database/auth backend. This project is not deployed until you complete these steps.

## Update: job-card approvals, closing, editing and role-based activity history

For the updated job-card workflow, run `MIGRATION_JOB_CARD_ROLES.sql` in **Supabase Dashboard → SQL Editor → New query → Run**. Run it after the original `schema.sql`. It is designed as a migration and does not delete existing stock or job-card records.

Then upload the updated frontend files from this ZIP to the existing GitHub repository, replacing the matching files and adding `MIGRATION_JOB_CARD_ROLES.sql` to the repository if you want to keep the migration documented. Commit the changes and wait for GitHub Pages to finish deploying. On the phone, refresh the site; if the old version remains, open it in Chrome and refresh again or clear the site cache.

Workflow after update:
- Admin and storekeeper can approve or reject pending provisional job cards and close open job cards.
- Only the admin can edit rejected or closed job cards. Admin and storekeeper can edit other job cards.
- Issue Parts only lists job cards with status `Open`; provisional cards must have been approved first.
- Technician codes from the technician-list RPC and previously used codes appear as suggestions; users can type a code manually.
- Admin and auditor can view all audit history. Storekeeper sees operational part/stock/job-card/order/exception events only. Other roles cannot open the audit page.

**Important:** The database migration is the security enforcement. Hiding a page or button in the browser alone is not a security control. If your current Supabase project has custom policies or function definitions, review the SQL output for errors before testing the workflow.
