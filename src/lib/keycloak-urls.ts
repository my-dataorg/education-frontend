export function keycloakRegistrationUrl(appBaseUrl: string): string {
  const issuer = process.env.KEYCLOAK_ISSUER!;
  const clientId = process.env.KEYCLOAK_CLIENT_ID!;
  const redirectUri = `${appBaseUrl}/api/auth/callback/keycloak`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
  });
  return `${issuer}/protocol/openid-connect/registrations?${params}`;
}

export function keycloakLogoutUrl(appBaseUrl: string, idToken?: string | null): string {
  const issuer = process.env.KEYCLOAK_ISSUER!;
  const clientId = process.env.KEYCLOAK_CLIENT_ID!;
  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: `${appBaseUrl}/login`,
  });
  if (idToken) {
    params.set("id_token_hint", idToken);
  }
  return `${issuer}/protocol/openid-connect/logout?${params}`;
}
