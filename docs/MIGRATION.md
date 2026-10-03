# Release and migration guide

Validate this release against a backed-up staging database before deploying it to production. The revised application has not been applied to the existing production database.

1. **Rotate exposed secrets.** Follow the historical credential notice in `SECURITY.md`. Changing files alone does not revoke a database credential. Update the production secret manager and local environments; use a new `SESSION_SECRET` to invalidate old sessions.
2. **Back up and clone the database.** Keep a tested restore path. Use MongoDB 7.0+ with a replica set/Atlas staging database, not the production URI during validation.
3. **Run the migration preview:** `npm run migrate`. It normalizes usernames/emails, validates legacy fields and unique identities, checks missing review authors/restaurants and owner restaurants, sanitizes rich text, initializes versions, and resolves legacy reply authors only when the current immutable relationships prove authorization. Existing message IDs that conflict with those relationships require manual resolution. Without `--apply`, it writes no documents.
4. **Resolve conflicts.** Duplicate normalized identities, invalid old usernames/bios, or orphan reviews must be resolved deliberately. A historical owner message with an unproven author remains uneditable; do not bind it based on a name alone. Check that every review references an existing restaurant.
5. **Apply to staging:** `npm run migrate -- --apply`. The database updates run in a transaction. Back up before applying. Take the application out of write service while migrating so a new review/identity does not race the preflight snapshot.
6. **Create and inspect indexes.** User username/email uniqueness, review listing/author/thread indexes, session expiry, and rate-limit expiry indexes are required. Mongoose initializes model indexes, but restricted production permissions may require an administrator to create them. Avoid blindly dropping existing indexes.
7. **Validate staged flows.** Registration, legacy-password upgrade, login/logout, remember-me, authorization denials, review editing/deletion, vote switching, owner threads, upload/remove, account deletion, missing IDs, and database outages. Real Cloudinary operations require staging credentials; local mocked tests are not evidence of provider success.
8. **Deploy deliberately.** Use Node 22.13+ or 24+, HTTPS, production cookies, a persistent session store, and a correctly scoped proxy setting. Apply the same reviewed migration to the backed-up production database during a maintenance window. Do not run demo seeds there.
9. **Verify and monitor.** `/health` checks the app process; `/ready` checks connection state. Monitor response errors, rate-limit failures, cleanup failures, database latency, and storage growth. Roll back application code and restore data only through the reviewed backup plan.

The supplied `vercel.json` keeps the project's serverless entry point and enables `NODE_OPTIONS=--experimental-require-module`. Vercel disables this module-loading feature by default, while the current `sanitize-html` dependency requires it; see [Vercel's Node.js runtime configuration](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module). Provider request limits also apply to uploads; see the upload limits in `SECURITY.md`. A successful provider build alone is not evidence that the function starts or that staged application flows work.

### Preview verification on October 3, 2026

Authenticated requests to the PR preview reproduced the provider's `ERR_REQUIRE_ESM` startup failure. After enabling the runtime flag, that failure was resolved and the preview reached configuration validation. Its existing `SESSION_SECRET` is missing or shorter than the required 32 characters, so application requests remain unavailable. Set a freshly generated secret in the appropriate Vercel environment and rebuild the preview before testing it. The app rejects invalid configuration with an uncached generic 503 and a safe `configuration_invalid` log event; local startup exits with a failure code. No weak-secret fallback is provided.

## Compatibility changes

- The session cookie changes from `connect.sid` to `tafteats.sid`; users sign in again.
- New passwords require 15–128 characters. Successful legacy logins still work and upgrade their hash.
- Usernames normalize to lowercase and must contain 3–30 letters, numbers, or underscores. Review ownership no longer accepts a username match when the user ID differs.
- Mutations require the CSRF token from the page; multipart requests send it in `X-CSRF-Token` before the upload parser runs.
- `/establishments/:id` now redirects to its working reviews page instead of rendering a nonexistent template.
- Account deletion requires the current password and a MongoDB replica set.
- Legacy rich text is sanitized at rendering time, even before migration. Old profile/media filenames use local fallback artwork; externally hosted assets must use the allowed Cloudinary origin.
- Original Compass and destructive user seed scripts are replaced by an isolated, empty-database-only demo seed.
