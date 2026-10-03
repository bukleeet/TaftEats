# Portfolio revival

This work preserves TaftEats' restaurant reviews, voting, owner conversations, and profiles while replacing unsafe academic shortcuts with tested application boundaries.

## Acceptance criteria

- [x] Authentication uses a memory-hard password hash, rotates sessions, and limits attempts.
- [x] All mutations enforce CSRF, input limits, and database-backed authorization.
- [x] Rich text, JSON, uploads, and profile activity have safe output boundaries.
- [x] Reviews, votes, threads, ratings, and account deletion remain consistent.
- [x] Local startup, isolated demo data, and deployment configuration are reproducible.
- [x] Core flows have integration tests, linting, and CI.
- [x] Responsive pages work with keyboard navigation, clear errors, and empty states.
- [x] Documentation covers architecture, migration, security, and portfolio attribution.

## Required release work

- [x] Remove the credential-containing `out.json` from published main history while preserving working edits.

- [ ] Rotate the historically exposed Atlas credential and session secret.
- [ ] Review and apply the migration to a backed-up staging database.
- [ ] Verify real Cloudinary operations with staging credentials.
- [ ] Review and deploy the revision, then verify the production configuration and flows.

No production data or existing deployment will be changed during local development. A release requires a reviewed migration and deployment configuration.
