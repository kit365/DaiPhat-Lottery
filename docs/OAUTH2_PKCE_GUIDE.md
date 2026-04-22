# OAuth2 PKCE Security Guide - DaiPhat Platform

This document explains the implementation of **PKCE (Proof Key for Code Exchange)** for the Google OAuth2 authentication flow in the DaiPhat Admin Dashboard.

## 🔒 Why PKCE?

In traditional OAuth2 "Authorization Code" flows, the application receives a `code` and exchanges it for a `token` using a `client_secret`. 

**The Problem:**
1. **Public Clients**: Single Page Applications (React, Vue, etc.) are "Public Clients". They cannot securely store a `client_secret` because any user can inspect the source code.
2. **Code Interception**: If an attacker intercepts the `code` (e.g., from browser history or malicious extensions), they could theoretically exchange it for a token if they had the secret or if no secret was required.

**The Solution:**
PKCE (pronounced "pixie") removes the need for a static secret by using a **dynamic, one-time secret** generated for every login attempt.

## 🚀 How it Works in DaiPhat

The flow follows these steps:

1. **Generation (LoginPage.tsx)**:
   - When you click "Login with Google", the app generates a `code_verifier` (a high-entropy random string).
   - It then creates a `code_challenge` by hashing the verifier with SHA-256 and Base64URL encoding it.
   - The `code_verifier` is saved in `sessionStorage`.

2. **Authorization Request**:
   - The app redirects you to Keycloak, sending the `code_challenge` and `code_challenge_method=S256`.
   - Keycloak "remembers" this challenge for your current session.

3. **Callback (OAuthCallbackPage.tsx)**:
   - After you login with Google, Keycloak redirects back with a `code`.
   - The app retrieves the `code_verifier` from `sessionStorage`.

4. **Token Exchange**:
   - The app sends the `code` AND the `code_verifier` to Keycloak's token endpoint.
   - Keycloak hashes the received `code_verifier` and compares it to the `code_challenge` it received in Step 2.
   - **If they match**, it proves that the same application that started the login is the one finishing it. Keycloak issues the token.

## 🛠 Files Involved

- `src/admin/utils/pkce.ts`: The cryptographic engine (generates verifiers and challenges).
- `src/admin/pages/authen/LoginPage.tsx`: Initiates the flow.
- `src/admin/pages/authen/hooks/use-oauth-callback.ts`: Completes the flow during token exchange.
- `infra/keycloak/realm-export.json`: Configures Keycloak to **enforce** PKCE for the `daiphat-client`.

## ⚠️ Troubleshooting

- **Invalid Code Verifier**: Ensure `sessionStorage` is not cleared during the redirect process.
- **S256 Not Supported**: Modern browsers support the Web Crypto API. If using an extremely old browser, PKCE may fail.
- **Keycloak Error**: If Keycloak says "PKCE required", it means the `code_challenge` was missing from the initial redirect.

---
*Built with ❤️ for DaiPhat Platform Security.*
