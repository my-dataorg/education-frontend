# Cursor agents — education-frontend

Education product UI: institutes, staff/student invitations, owner dashboard, sections.

## Education agents

| Agent | When to use |
|-------|-------------|
| **frontend-developer** | **Primary** — all UI implementation, components, pages, BFF routes |
| **edu-super** | Architecture, role matrix, cross-cutting design |
| **edu-staff** | Staff roster, invitations, branches, staff UX |
| **edu-student** | Student admission, sections, submissions UX |

## General agents

| Agent | When to use |
|-------|-------------|
| **planner** | Task breakdown |
| **testing-agent** | After UI/API route changes |
| **code-review** | Review diff |
| **documentation** | Update `docs/` |

## Feature flow

```
edu-super (design) → planner → implement → testing-agent → code-review
```

For staff-only work → **edu-staff**. For student-only → **edu-student**.

## Docs in this repo

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Run on port 3010 |
| [docs/architecture.md](docs/architecture.md) | UI structure, tabs, roles |
| [docs/invitations.md](docs/invitations.md) | Invite / accept / decline flows |
| [docs/development.md](docs/development.md) | Local setup with platform |

## Rules

See `.cursor/rules/` — `frontend-nextjs`, `ui-design`, `api-boundaries`.

## Related repos

- [education-backend](https://github.com/my-dataorg/education-backend) — port 8010
- [platform-frontend](https://github.com/my-dataorg/platform-frontend) — SSO + marketplace
