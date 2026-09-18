<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- BASE44:BEGIN -->
## Base44 dev environment

This is a **TanStack Start (SSR React) + Vite** frontend. Its backend is **Supabase** (remote, hosted) — there is no Python/FastAPI service in this repo despite the README.

### Running it
- `docker compose -f docker-compose.base44.yml up -d` boots a `node:22-slim` container that bind-mounts the repo, runs `npm install`, then `vite dev` on port 3000 with live reload.
- `node_modules` lives in a named Docker volume (`node_modules`) so host bind-mount stays clean.

### Environment / secrets
- The repo `.env` already contains the **public** Supabase URL + publishable key (`VITE_SUPABASE_*` and `SUPABASE_*`). Vite auto-loads `.env` for client `import.meta.env`; the compose also passes them to the container for SSR `process.env` fallback.
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS) is **not** required to boot — it's lazily created only for admin/server operations. Provide it via the Base44 secrets dashboard to enable admin features; it's delivered through `/run/base44/app.env`.

### Vite host allow
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed bare into the service env so Vite ≥6.1 accepts the preview origin. Do not pin an exact host — the sandbox id rotates.

### Verify
- `curl -s --compressed http://localhost:3000/` should return HTTP 200 with the ForensicAI landing HTML (SSR). The dev server logs `VITE v8.x ready` and `[vite] (ssr) connected`.
<!-- BASE44:END -->
