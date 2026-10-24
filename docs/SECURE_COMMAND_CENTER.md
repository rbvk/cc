# RV Command Center — secure deployment plan

## Current implementation
This repository contains a Vite/React application. Do not replace its `index.html` with a static dashboard: the application loads through `/src/main.jsx`. The repository includes a protected-runtime verification step; preserve it.

## Deployment prerequisites
- Build using the repository's existing `npm run build` workflow and publish the generated `dist/` folder through a GitHub Pages deployment workflow.
- For a project site at `rbvk.github.io/cc/`, configure Vite's base path as `/cc/`; for a custom domain `cc.rodolfovalle.com`, use `/`. Verify all routes and assets after deploying.
- Configure a DNS CNAME for `cc` pointing to `rbvk.github.io`; enable HTTPS after certificate issuance.
- Do not assume repository privacy restricts access to the published Pages site.

## Security boundary
GitHub Pages is a **public static frontend**, not a private database or access-control system.
- Never commit patient data, medical notes, financial records, OAuth client secrets, API keys, refresh tokens or service-account credentials.
- Authenticate with Google OpenID Connect, allowlist exactly one Google subject (`sub`) on the backend, and verify the ID token issuer, audience, signature and expiry server-side.
- Enforce authorization on **every** private API request, not only by hiding frontend controls.
- Keep OAuth tokens server-side; use short-lived, Secure, HttpOnly, SameSite cookies and CSRF protection where applicable.
- Backend recommendation: Google Cloud Run with Secret Manager; restrict CORS to the actual frontend origin and avoid sensitive logging.
- Use minimum read-only Google Calendar/Sheets scopes, and keep patient-identifying records out of this dashboard. Aggregate clinical counts server-side.
- Return `Cache-Control: no-store` for private responses; do not embed private responses in static build artifacts.

## Decision-oriented modules
1. **Now**: next verified appointment, action and blocking condition.
2. **Calendar**: authorized events and schedule conflicts, without unnecessary patient details.
3. **MTS**: today's planned training, DRG readiness and execution state.
4. **Clinical operations**: aggregate counts, occupancy and net revenue, never clinical records.
5. **Finance**: goal versus actual, fetched only after authentication.
6. **Projects**: concrete next action, owner, blocker and completion evidence.

Each widget should show its last sync time and an explicit unavailable state rather than fabricated zeros.

## Release gates
- Existing `npm test`, `npm run verify:runtime` and `npm run build` pass.
- No secrets or private data in repository, build output, network responses to unauthorized users, or browser localStorage.
- Signed-out users cannot retrieve private API data.
- Only the allowlisted Google account can access private endpoints.
- Custom domain and HTTPS work, and direct navigation/assets load.
- Mobile, keyboard accessibility, empty/error states and time zone America/Santiago are checked.

## Pending configuration
The authorized Google account must be configured through a private backend setting; do **not** add an email address or Google subject to this public repository. Google Cloud project, OAuth client, deployment workflow and DNS configuration remain to be implemented and verified.
