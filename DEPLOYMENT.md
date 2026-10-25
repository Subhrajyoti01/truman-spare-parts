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


## Existing database fixes (October 2026)

If the admin delete button reports that `public.admin_delete_part(p_part_id)` is missing, open Supabase SQL Editor and run the contents of `SUPABASE_FIXES.sql`. This installs the function with workshop-admin-only permissions and asks Supabase to reload its schema cache. Do not rerun the entire schema on an existing database. The Receive Stock camera and Create New Part buttons are wired in `js/stock-movements.js`; deploy the updated project files to GitHub Pages and hard-refresh the website.
