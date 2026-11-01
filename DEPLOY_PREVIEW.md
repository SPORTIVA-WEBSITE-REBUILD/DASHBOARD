# Deploy preview: `webinar-integration` — admin dashboard

## Site
Deploys to the Netlify site named **pcnsportivalp-admin**
(production `https://admin.pcnsportivalp.com`). From local project files,
not a live check in this session — confirm in Netlify if stale.

**Branch deploys must be enabled**, same as the other two repos. Once on:
```
https://webinar-integration--pcnsportivalp-admin.netlify.app
```

## Environment variables the branch build needs (NAMES only)

- `VITE_API_URL` — must point at the API's `webinar-integration` branch
  deploy, exactly as in the website's doc:
  ```
  VITE_API_URL=https://webinar-integration--pcnsportivalp-api.netlify.app/api
  ```
  Must be set in the **Branch deploys** context, not only Production, and
  set before the build runs (Vite inlines it at build time).

## How the dashboard preview logs in against the API preview

This is the part most likely to silently fail, so it's worth being precise
about the actual mechanism (`src/lib/tokens.js` on the API):

1. Login sets two httpOnly cookies. Whether the browser accepts them
   cross-site depends on `SameSite` and `Secure`, which the API derives
   from whether `COOKIE_DOMAIN` is set:
   `crossSite = env.isProd && !env.cookieDomain` → `SameSite=None; Secure`
   when true, `SameSite=Lax` otherwise.
2. The dashboard preview (`...--pcnsportivalp-admin.netlify.app`) and the
   API preview (`...--pcnsportivalp-api.netlify.app`) are **different
   site names** — cross-site, even though both end in `.netlify.app`.
   For the login cookie to be accepted, the API must send
   `SameSite=None; Secure`, which requires:
   - `NODE_ENV=production` on the API's branch-deploy context (so
     `env.isProd` is true — Netlify Functions don't set this
     automatically the way "Production" vs "Branch deploy" contexts might
     suggest; it must be an explicit env var), **and**
   - `COOKIE_DOMAIN` **left unset** on the API's branch-deploy context.
     Setting it to `.pcnsportivalp.com` (the production value) would break
     this specific cross-site case, because the preview cookie would then
     be scoped to a domain neither preview site is actually on.
3. **CORS**: the API's `CORS_ORIGIN` must contain this exact dashboard
   preview origin (`https://webinar-integration--pcnsportivalp-admin.netlify.app`)
   — see BACK-END/DEPLOY_PREVIEW.md. Without it, the login request itself
   is rejected before cookies are even relevant.

If login on the preview silently fails (form submits, no error, but you're
not signed in), check `SameSite`/`Secure` on the two cookies in the browser
dev tools first — that's the most likely cause, not a bug in the login
route itself.

## New screens, same auth
The two new sidebar screens (Webinar settings, Registrations) are added
inside the existing authenticated app and `requirePermission('webinar:*')`
— no new auth flow, no new login page. If you're already signed in on this
preview, they should just appear in the sidebar once that stage of the
front-end work lands (website hero + dashboard screens are Stage 2,
in progress — not yet pushed as of this doc).

## Safety for this branch
The dashboard holds no secrets of its own (same note as its own
`.env.example`). The only thing worth double-checking is, again,
`VITE_API_URL` — if it silently falls back to `localhost`, every screen in
the preview will show "failed to fetch" rather than a clear error pointing
at the real cause.
