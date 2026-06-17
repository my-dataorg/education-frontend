# Architecture — education-frontend

## Pages

| Route | Audience |
|-------|----------|
| `/login` | SSO entry |
| `/institutes` | List / invitations landing |
| `/institutes/{id}` | Owner/staff dashboard or student sections |
| `/institutes/{id}/sections/{sectionId}` | Section workspace |
| `/invitations` | Accept / decline pending invites |

## Owner dashboard tabs

| Tab | Roles | Content |
|-----|-------|---------|
| Summary | Staff | Branch stats, events, join code |
| Staff | Manage: owner/admin | Invite staff, roster |
| Students | Manage: owner/admin | Admit students, roster |
| Branches | Manage: owner/admin | Campus CRUD |

Teaching staff see Staff/Students read-only. Students see sections grid only.

## BFF

All API calls go through `src/app/api/**` route handlers with session JWT — never expose education-backend URL to browser for authenticated writes.

## Components

| Component | Purpose |
|-----------|---------|
| `institute-dashboard.tsx` | Tabbed owner/staff UI |
| `invite-user-field.tsx` | Keycloak user search autocomplete |
| `invitations-list.tsx` | Accept / decline cards |
| `manage-institutes-dropdown.tsx` | Create / join / delete institutes |

See [education-backend docs](../education-backend/docs/architecture.md) for domain model (backend repo).
