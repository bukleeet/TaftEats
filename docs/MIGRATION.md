# Releasing the revival

The local work does not modify the existing database or deploy to either Git remote. Review this release against a staging clone before changing the legacy deployment.

1. **Rotate exposed secrets.** Follow the historical credential notice in `SECURITY.md`. Changing files alone does not revoke a database credential. Update the production secret manager and local environments; use a new `SESSION_SECRET` to invalidate old sessions.
2. **Back up and clone the database.** Keep a tested restore path. Use a replica set/Atlas staging database, not the production URI during validation.
3. **Run the migration preview:** `npm run migrate`. It normalizes usernames/emails, validates identities, checks orphan reviews, sanitizes rich text, initializes versions, and resolves legacy reply authors only when the current immutable relationships prove authorization. Without `--apply`, it writes nothing.
4. **Resolve conflicts.** Duplicate normalized identities, invalid old usernames/bios, or orphan reviews must be resolved deliberately. A historical owner message with an unproven author remains uneditable; do not bind it based on a name alone. Check that every review references an existing restaurant.
5. **Apply to staging:** `npm run migrate -- --apply`. The database updates run in a transaction. Back up before applying. Take the application out of write service while migrating so a new review/identity does not race the preflight snapshot.
6. **Create and inspect indexes.** User username/email uniqueness, review listing/author/thread indexes, session expiry, and rate-limit expiry indexes are required. Mongoose initializes model indexes, but restricted production permissions may require an administrator to create them. Avoid blindly dropping existing indexes.
7. **Validate staged flows.** Registration, legacy-password upgrade, login/logout, remember-me, authorization denials, review editing/deletion, vote switching, owner threads, upload/remove, account deletion, missing IDs, and database outages. Real Cloudinary operations require staging credentials; local mocked tests are not evidence of provider success.
8. **Deploy deliberately.** Use Node 22.13+ or 24+, HTTPS, production cookies, a persistent session store, and a correctly scoped proxy setting. Apply the same reviewed migration to the backed-up production database during a maintenance window. Do not run demo seeds there.
9. **Verify and monitor.** `/health` checks the app process; `/ready` checks connection state. Monitor response errors, rate-limit failures, cleanup failures, database latency, and storage growth. Roll back application code and restore data only through the reviewed backup plan.

The supplied `vercel.json` keeps the project's serverless entry point. Provider request limits also apply to uploads; see the upload limits in `SECURITY.md`. This revision is prepared locally and has not been verified on Vercel.

## Compatibility changes

- The session cookie changes from `connect.sid` to `tafteats.sid`; users sign in again.
- New passwords require 15–128 characters. Successful legacy logins still work and upgrade their hash.
- Usernames normalize to lowercase and must contain 3–30 letters, numbers, or underscores. Review ownership no longer accepts a username match when the user ID differs.
- Mutations require the CSRF token from the page; multipart requests send it in `X-CSRF-Token` before the upload parser runs.
- `/establishments/:id` now redirects to its working reviews page instead of rendering a nonexistent template.
- Account deletion requires the current password and a MongoDB replica set.
- Legacy rich text is sanitized at rendering time, even before migration. Old profile/media filenames use local fallback artwork; externally hosted assets must use the allowed Cloudinary origin.
- Original Compass and destructive user seed scripts are replaced by an isolated, empty-database-only demo seed.
