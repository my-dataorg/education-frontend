# Invitations — education-frontend

## Send invitation (admin / owner)

1. Open institute → **Staff** or **Students** tab
2. Use invite form — type 2+ characters for user search (Keycloak)
3. Choose role (staff roles or student)
4. **Send invitation** — appears under pending list

## Accept / decline (invitee)

Invitee signs in with the **same email** as their MyData account.

| Surface | Location |
|---------|----------|
| Banner | Top of all Education pages |
| Institutes landing | `/institutes` |
| Invitations page | `/invitations` |
| Login | When already signed in with pending invites |
| Platform | [platform-frontend](https://github.com/my-dataorg/platform-frontend) `/invitations` |

## After accept

- User becomes `InstituteMember` with invited role
- **Education subscription** required to open institute dashboard (marketplace subscribe first)
- Staff roles → dashboard tabs; students → sections list

## API (via BFF)

| Action | Route |
|--------|-------|
| List mine | `GET /api/invitations/me` |
| Accept | `POST /api/invitations/{id}/accept` |
| Reject | `POST /api/invitations/{id}/reject` |
| Send | `POST /api/institutes/{id}/invitations` |

Backend detail: [education-backend/docs/api.md](https://github.com/my-dataorg/education-backend/blob/main/docs/api.md)
