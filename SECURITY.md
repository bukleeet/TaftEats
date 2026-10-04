# Security model

TaftEats uses the security boundaries described below. Public deployment requires ongoing operation: secure configuration, patched dependencies, protected database users, backups, and abuse monitoring remain necessary.

## Controls

| Boundary             | Control                                                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account identity     | Normalized unique usernames/emails; server-side type and size checks; no client-supplied roles                                                                                        |
| Passwords            | Async scrypt with 128 MiB working memory per calculation; salt; timing-safe comparison; legacy upgrade                                                                                |
| Sessions             | MongoDB persistence; login regeneration; HTTP-only SameSite=Lax cookies; Secure in production; 12-hour normal / 21-day remembered duration                                            |
| Cross-site mutations | Synchronizer token on every unsafe method, including login/logout/registration; cross-site Fetch Metadata rejection                                                                   |
| Authorization        | Fresh database account per request; immutable review/user/restaurant IDs; author checks before edit uploads                                                                           |
| User HTML            | sanitize-html with formatting-only tags and no attributes; legacy content sanitized at read time                                                                                      |
| Browser              | Helmet, restrictive CSP, no inline event handlers or CDN scripts; allowed Cloudinary HTTPS media only; no credentials in localStorage                                                 |
| Abuse                | MongoDB shared fixed-window limits: 300 requests, 20 auth attempts, 20 upload requests per IP per 15 minutes; two upload requests per process                                         |
| Uploads              | MIME allowlist plus detected signatures; bounded size/fields/count; image re-encoding; compensation on failed saves; deletion scoped to owned review URLs and configured cloud/folder |
| Consistency          | Atomic vote pipelines; optimistic document versions; shared transactional account guard for deletion and new references; computed ratings                                             |
| Diagnostics          | Request IDs; generic server errors; logs exclude passwords, request bodies, session IDs, and database URIs                                                                            |

Password and CSRF design references: [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), and [Express production security](https://expressjs.com/en/advanced/best-practice-security/).

## Historical credential exposure

Commit `54dc2deb10fc18b2941a4bdb05af2c87293b3ab3` contains a MongoDB Atlas credential and the session secret in the deleted file `out.json`. Offline checks found both match the current local environment files at the time of the security review. The exposed values are deliberately omitted from this document.

On October 4, 2026, the Atlas password was rotated, local and Vercel database configuration were updated, and authentication with the exposed password was confirmed rejected. A fresh production `SESSION_SECRET` was saved in Vercel and deployed, invalidating old signed sessions. Preview uses a separate secret. Atlas permissions were narrowed to `readWrite` on the application and staging databases; an unrelated database's listing was denied. Network access and access logs still require operational review.

On October 3, 2026, `out.json` was removed from the affected `main` history and the cleaned branch was pushed with an explicit force-with-lease. The previous head was `577e963c0b34d5fa36293c7ff0d531256334ecde`; the cleaned head is `494a30e5bfb83cf3c61cea2e6f55fcca1d6fae37`. Their current file trees are identical. Other published branches did not contain the file and were preserved. Credential rotation was subsequently completed as described above.

`npm run secrets:check` checks current tracked and non-ignored working files without printing credential values. `node scripts/check-secrets.js --history` checks all locally available reachable history. This small scanner is deliberately high-confidence and is not a substitute for a full secret-scanning service. Existing clones and hosting caches may retain the previous objects; see [GitHub's sensitive-data cleanup guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

An ignored local recovery bundle is stored at `.cache/history-cleanup/pre-rewrite.bundle`. It contains the old history and exposed values: keep it private, never deploy/share it, and remove it once recovery is no longer needed. GitHub collaborators should fetch the cleaned history and avoid merging old branches or reintroducing the removed file.

## Deployment and operational limits

Attachments have a **3 MiB total budget per request**, with up to 10 files. This leaves headroom under Vercel's [4.5 MB request-body limit](https://vercel.com/docs/functions/limitations). The local parser enforces the file count and aggregate budget; requests above the provider limit can be rejected before the application runs. Larger uploads would require a separately designed direct-upload flow.

- Use HTTPS, `NODE_ENV=production`, a high-entropy session secret, and a least-privileged database user. Set `TRUST_PROXY=1` only behind a trusted one-hop proxy. Incorrect proxy configuration weakens IP limiting and Secure-cookie handling.
- MongoDB must be a replica set. Apply migration and verify indexes before deployment. Do not enable automatic demo seeding on deployment.
- File signature checks are format checks, not malware analysis. Cloudinary must reject invalid decodes and re-encode images; review its account settings and content moderation before allowing public uploads.
- MongoDB transactions cannot include Cloudinary. Failed asset deletion is logged for retry; failed uploads are compensated where possible. A process crash between upload and database save can still leave an orphan. Periodic reconciliation is needed in a public service.
- Search uses escaped, bounded regex. MongoDB sorts and paginates restaurant discovery; only the requested page reaches application memory. Rating sorting computes aggregates over matching restaurants and can spill its sort to database disk. Name sorting calculates ratings only for the selected page. Restaurant-detail totals filter by its indexed ID. Review and activity responses are paginated/bounded. Large-scale search still needs query monitoring and an appropriate search index.
- IP limits mitigate common abuse; they do not stop distributed attacks. Use provider-level DDoS/WAF protections and alerts. Email verification, password recovery, automated moderation, and MFA are not implemented.
- Accessibility automation catches a subset of WCAG issues. Manual screen-reader and assistive-technology checks remain useful before a public launch.
- Local tests use isolated MongoDB and mocked external media operations. A separate October 4 release check verified real Cloudinary upload, WebP conversion, scoped URLs, and deletion of a new disposable asset. Production readiness, rendering, and cookie/header checks also passed. See `docs/RELEASE.md` for evidence and remaining operational work.
- The updated Vercel project scopes application credentials to Production. Hosted previews need their own isolated database and session configuration before mutation testing. The original app uses the separate `tafteats_original` database and a separate session secret; its older source does not provide the updated application's security controls. The two apps and staging share a database user with narrowly scoped read/write roles; dedicated users would strengthen access isolation. The Atlas network allowlist permits all IP addresses, and the free cluster has no managed backups; restricted deployment egress and recurring backups remain operational tasks.

## Reporting

Report vulnerabilities privately to the repository maintainer through the repository host's private vulnerability reporting feature when available. Include the affected route, prerequisites, a minimal reproduction, and impact. Do not publish active credentials or real user data in issues.
