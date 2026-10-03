# Contributing

Read `README.md`, `SECURITY.md`, and `docs/ARCHITECTURE.md` before making changes. Use an isolated database and never seed, test, or experiment against production data.

Keep controllers focused on HTTP behavior, shared validation in `src/lib`, and authorization in route middleware before expensive upload parsing. Never authorize by a display name. New mutation endpoints must require CSRF and appropriate identity checks.

Use explicit scalar input validation and bounded queries. Escape text in EJS; only render HTML supplied by the shared sanitization boundary. In browser code, prefer DOM creation and textContent to user-controlled HTML interpolation.

Add regression tests for changes to security boundaries, concurrency, deletion, and external-service compensation. Run `npm run check`, `npm run secrets:check`, `npm audit`, and the browser suite before proposing a release. Document external checks that were mocked or not exercised.

Use `npm ci` and commit `package-lock.json` with dependency changes. Run `npm run format` for consistent formatting. Keep secrets, local tooling state, and browser traces out of Git. Preserve original team attribution and describe revival contributions accurately.
