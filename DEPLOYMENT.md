# RV Command Center — deployment

## What is implemented
- Static dashboard at the root `index.html`, with a signed-out screen and authenticated data calls.
- GitHub Pages workflow publishing only `index.html`, `config.json`, and `CNAME`. The existing React/Vite source is preserved and is **not** deployed by this workflow.
- Cloud Run-compatible Node backend with Google OIDC, strict single-user Google `sub` allowlist, Redis-backed sessions, protected `/api/dashboard`, and optional read-only Google Calendar count.
- No clinical records, Sheets contents, financial figures or Google credentials in the public static site.

## Required operator configuration (not yet performed)
1. GitHub Settings > Pages: choose **GitHub Actions** as deployment source. Make repository public if the GitHub plan requires public repositories for Pages.
2. DNS: set `cc.rodolfovalle.com` CNAME to `rbvk.github.io`; verify certificate issuance and enforce HTTPS.
3. Google Cloud: create project, enable Cloud Run and Google Calendar API, configure OAuth consent screen and a **Web application** OAuth client. Authorized redirect URI must equal `https://YOUR_BACKEND_HOST/auth/google/callback`.
4. Provision Cloud Run, a managed Redis-compatible session store, and Secret Manager. Set backend variables `PUBLIC_ORIGIN=https://cc.rodolfovalle.com`, `BACKEND_ORIGIN=https://YOUR_BACKEND_HOST`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTHORIZED_GOOGLE_SUB`, `SESSION_SECRET`, `REDIS_URL`. Supply sensitive variables through Secret Manager. `AUTHORIZED_GOOGLE_SUB` is the stable Google account subject, **not** an email address. Never commit these values.
5. If using Calendar, grant the Cloud Run service identity read-only access to the selected calendar and set `CALENDAR_ID`. Service identity must not be granted unrestricted access to clinical records.
6. Set `config.json` `apiBase` to the HTTPS backend origin (public URL, not a secret). Deploy.
7. Verify an unauthorized Google account receives HTTP 403 and signed-out API calls return HTTP 401. Check that no sensitive data is present in Pages source, browser storage or network responses.

## Important limitations
- Google Sheets/MTS/clinical/finance data adapters and prioritization rules are **not yet implemented**. UI correctly reports these integrations as unavailable; it does not fabricate data.
- OAuth flow requires external cloud credentials and an authorized Google subject; it cannot be activated by a Git commit alone.
- Cross-site session cookies can be blocked by browsers when frontend and backend use unrelated domains. Prefer a same-site backend subdomain such as `api.rodolfovalle.com` and verify cookie behaviour in Safari/Chrome.
- For clinical data, return only minimally necessary aggregate metrics; do not expose patient identifiers or case notes.
- Cloud Run/Redis/Secret Manager can incur charges. Verify pricing and budget alerts before provisioning.
- No build, browser, live login or deployment verification has yet been performed.

## Security note
A static Pages login screen is not access control. Every private API endpoint must enforce authentication and authorization on the server.
