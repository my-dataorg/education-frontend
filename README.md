# education-frontend

Education product UI — institutes, owner dashboard, invitations, sections.

**Org:** [my-dataorg](https://github.com/my-dataorg) · **Stack:** Next.js 15 · TypeScript · Keycloak SSO

## Run locally

```bash
./scripts/run.sh
```

Or manually:

```bash
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3010
```

**Requires:** Keycloak, [platform-backend](https://github.com/my-dataorg/platform-backend) (8002), [education-backend](https://github.com/my-dataorg/education-backend) (8010).

## Key flows

| Flow | Entry |
|------|-------|
| Create / join institute | Manage institutes dropdown |
| Owner dashboard | `/institutes/{id}?tab=summary\|staff\|students\|branches` |
| Send invitation | Staff or Students tab |
| Accept invitation | `/invitations`, banner, or login page |

## Documentation

| Doc | Description |
|-----|-------------|
| [AGENTS.md](AGENTS.md) | Cursor agents (edu-super, edu-staff, edu-student) |
| [docs/architecture.md](docs/architecture.md) | UI structure and roles |
| [docs/invitations.md](docs/invitations.md) | Invite / accept / decline |
| [docs/development.md](docs/development.md) | Local setup |
| [docs/design-system.md](docs/design-system.md) | UI tokens |

## Related repos

- [education-backend](https://github.com/my-dataorg/education-backend)
- [platform-frontend](https://github.com/my-dataorg/platform-frontend)
