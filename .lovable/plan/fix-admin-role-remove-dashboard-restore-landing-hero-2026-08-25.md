# Fix admin role, remove Dashboard, restore landing hero

## 1. Remove the Dashboard page

- Delete the Dashboard route and its sidebar entry.
- Make **Workspace Home** the landing page after sign-in: all post-login redirects (sign in, sign up, Google, already-signed-in) go to `/home` instead of `/dashboard`.
- Move the useful Dashboard widgets (total cases, high/critical, malware detected, average threat score, threat-score trend, risk distribution) onto Analytics so nothing is lost, and leave Home as the quick-actions + case list page.

## 2. Admin shows up as "Analyst" on another device

Verified in the database: `yashu123948@gmail.com` is `approved` and does hold the `admin` role, so the data is correct — the app is failing to read it reliably on a fresh device.

Cause in the code: the role lookup runs twice on startup (once from the auth-state listener, once from the session check) and its result is never error-checked. If either call returns an error or empty result during the first seconds of a new session, the app silently records "not admin" and never retries, so the account renders as Analyst with no Admin panel.

Fix:
- Check the error from the profile/role reads; on failure keep the previous known state instead of downgrading to Analyst, and retry with a short backoff.
- Run the lookup once per signed-in user (no duplicate racing calls), and re-run it on token refresh and when the tab regains focus.
- Show a neutral "loading role" state rather than defaulting to Analyst before the lookup resolves.
- Keep the Admin panel and admin-only actions gated on the resolved role only.

## 3. Deployed landing page shows only the 3D scene

On the deployed build the hero text, buttons and everything below the fold are missing — only the 3D background renders. The hero copy is animated in from `opacity: 0`; when that entrance animation doesn't run on the deployed bundle, the content stays invisible while the 3D canvas behind it still paints.

Fix:
- Make the hero content visible by default and treat the animation as progressive enhancement (animate from a visible baseline / respect reduced motion), so text renders even if the animation library doesn't kick in.
- Explicitly stack the hero: canvas layer behind (non-interactive, clipped to the hero height), text layer above it.
- Verify against a production build in the browser that the headline, sub-copy, both CTAs, and the Capabilities / Agents / Pipeline sections all render and the CTAs are clickable.

## Technical notes

- Delete `src/routes/_authenticated/dashboard.tsx`, drop the nav item in `AppShell.tsx`, update the four `/dashboard` navigations in `src/routes/auth.tsx`, and regenerate the route tree.
- Rework `src/hooks/useAuth.tsx`: single guarded `loadProfile` per user id, error-aware (`{ data, error }`) handling with retry, re-run on `TOKEN_REFRESHED` and focus, and expose a `roleLoaded` flag consumed by `AppShell`, `settings.tsx`, `admin.tsx`, and `report.$caseId.tsx`.
- In `src/routes/index.tsx`: hero wrapper gets an explicit `z-10`, the `CyberScene` container `-z-10 pointer-events-none overflow-hidden`, and motion elements start visible.
- No database or RLS changes are needed.
