# Release checklist

TaftEats supports restaurant reviews, voting, owner conversations, and profiles with tested application boundaries.

## Acceptance criteria

- [x] Authentication uses a memory-hard password hash, rotates sessions, and limits attempts.
- [x] All mutations enforce CSRF, input limits, and database-backed authorization.
- [x] Rich text, JSON, uploads, and profile activity have safe output boundaries.
- [x] Reviews, votes, threads, ratings, and account deletion remain consistent.
- [x] Local startup, isolated demo data, and deployment configuration are reproducible.
- [x] Core flows have integration tests, linting, and CI.
- [x] Responsive pages work with keyboard navigation, clear errors, and empty states.
- [x] Documentation covers architecture, migration, security, and team attribution.

## Required release work

- [x] Remove the credential-containing `out.json` from published main history while preserving working edits.

- [x] Rotate the historically exposed Atlas credential and session secret.
- [x] Review and apply the migration to a backed-up staging database.
- [x] Verify real Cloudinary upload, WebP conversion, scoped URLs, and deletion using a disposable asset.
- [x] Apply the backed-up production migration and verify the production deployment.

## Production release: October 4, 2026

Production runs at [tafteats.vercel.app](https://tafteats.vercel.app) from `refactor/tafteats`. The previous `taft-eats.vercel.app` domain redirects permanently to it. Production branch tracking is configured for this branch.

- The rotated Atlas credential connects successfully; authentication with the exposed password is rejected. Vercel stores the database URI and fresh production session secret as Secret variables. Preview uses a separate session secret.
- A private logical backup was restored to `tafteats_staging_20261004` and compared document-for-document. Migration preflight, transactional application, postflight, and index creation passed there.
- A fresh private production backup preceded the same transactional migration during a maintenance window. Postflight preserved 29 users, 47 reviews, and 10 restaurants; required application indexes were created successfully. The project was resumed after maintenance.
- The production build of `2b1ed48` reached Ready. `/health` and `/ready` returned 200. Discovery displays the existing restaurants and ratings; sign-in serves a CSRF token, a Secure/HttpOnly session cookie, restrictive CSP, and `Cache-Control: no-store`.
- Application CI passed on Node 22 and 24: 61 unit/HTTP/runtime tests and 3 browser journeys, including responsive and automated accessibility checks. Real Cloudinary verification created and removed only its new disposable test asset.

## Follow-up validation: October 4, 2026

The hero restores the original food photograph as a local 136 KB WebP, serif typography with italic accents, and consistent spacing through all seven animated phrases. Browser checks verify the image loads, the description stays fixed as languages change, and the heading fits a 320 px viewport. Light/dark theme, pause, reduced-motion, and rendered accessibility checks passed.

New regression tests reproduce review, vote, and reply requests that were authenticated before account deletion. A shared transactional account write now rejects those requests after deletion and compensates uploaded media. Cleanup preserves unrelated review versions. Validation passed: 64 unit/HTTP/runtime tests, 3 browser journeys, lint, formatting, zero working-tree secret findings, and zero dependency audit findings.

## Remaining operational work

- The production database URI is scoped to Production and Development. A Preview-only staging URI is awaiting credential entry; rebuild previews after saving it before testing hosted mutations. Use the isolated local demo meanwhile.
- Atlas application permissions were narrowed from administrator access to `readWrite` on `myDatabase` and `tafteats_staging_20261004`. Fresh authentication and application index creation passed; listing an unrelated database was denied. Separate database users would further isolate production from staging.
- Atlas's network allowlist currently permits all IP addresses. Tighten it using verified deployment egress addresses; removing access without a compatible egress setup would disconnect the app. Establish recurring backups and monitoring; the current Atlas free cluster has no managed backups.
- Provider runtime logs contain Node's `DEP0169` URL-parsing deprecation warning on otherwise successful requests. No application database/startup errors were observed in the fresh release checks. Investigate the warning's dependency/provider origin before changing application behavior.

Keep the ignored release backups and credential files private. Detailed operational limits remain in `SECURITY.md`; production release does not eliminate those limits.
