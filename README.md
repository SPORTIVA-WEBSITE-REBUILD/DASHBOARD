# PCN Sportiva LP — Admin Dashboard

React 18 + Vite. The content management interface for the public website.

**Related repositories**
- API — `SPORTIVA-WEBSITE-REBUILD/BACK-END`
- Public website — `SPORTIVA-WEBSITE-REBUILD/FRONT-END`

---

## Running locally

Requires the API running (see the BACK-END repository).

```bash
npm install
cp .env.example .env
npm run dev                   # http://localhost:5174
```

Sign in with an account created by `npm run create-admin` in the API repository.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Component tests |

## Security

This application holds **no secrets**. Authentication is an httpOnly cookie that
JavaScript cannot read, so there is nothing in the bundle worth stealing.
Everything it can do is enforced again server-side — the permission checks here
only hide what a role cannot use, they do not grant anything.
