# ⚠️ Security Notice: Keycloak Realm Configuration

The current `realm-export.json` has been partially hardened but still contains development-friendly defaults.

## Hardened Configurations (Latest Update):
1.  **Impersonation**: **Disabled**. The service account no longer has impersonation rights by default.
2.  **SSL Required**: **`external`**. HTTPS is now required for all external connections. Local development over HTTP is still permitted.

## Remaining High-Risk / Dev-Only Defaults:
1.  **Verify Email: `false`**: Disables mandatory email verification. This should be enabled (`true`) for production environments to prevent spam/unverified accounts.
2.  **Access Token Lifespan**: Currently set to **86400s (24h)**. This is very long for an access token and should be significantly reduced (e.g., 5-15 mins) in production, relying on refresh tokens instead.

## Recommendations:
- Ensure `sslRequired` is set to `all` for production environments.
- Enable `verifyEmail: true` and `loginWithEmailAllowed: true` for stricter account security.
- Reduce token lifespans for production environments.

