# Development — education-frontend

## Prerequisites

1. Start infra: `platform-backend/infra/local` → `docker compose up -d`
2. Run **platform-backend** on port 8002
3. Run **education-backend** on port 8010
4. Run **platform-frontend** on port 3000 (for marketplace subscribe)
5. Run this app on port 3010

## Environment (`.env.local`)

| Variable | Example |
|----------|---------|
| `AUTH_URL` | `http://localhost:3010` |
| `AUTH_SECRET` | Same as platform-frontend |
| `KEYCLOAK_ISSUER` | `http://localhost:8080/realms/mydata` |
| `EDUCATION_API_URL` | `http://localhost:8010` |

## Demo user

- Email: `demo@mydata.local`
- Password: `demo1234`

Subscribe to Education in platform marketplace before using institute APIs.

## Common issues

| Issue | Fix |
|-------|-----|
| Education subscription required | Subscribe at platform marketplace |
| Invitee not seeing invite | Use exact Keycloak login email; check banner on `/invitations` |
| API 401 | Re-login; ensure `AUTH_SECRET` matches platform |
