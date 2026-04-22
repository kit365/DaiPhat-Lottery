package com.daiphat.accountservice.infrastructure.adapter.auth;

/**
 * Các hằng số đặc thù cho Keycloak Identity Provider và OAuth2 Token Exchange.
 */
public final class KeycloakConstants {
    private KeycloakConstants() {
    }

    // OAuth2 Grant Types
    public static final String GRANT_TYPE_CLIENT_CREDENTIALS = "client_credentials";
    public static final String GRANT_TYPE_TOKEN_EXCHANGE = "urn:ietf:params:oauth:grant-type:token-exchange";

    // OAuth2 Parameter Names
    public static final String PARAM_GRANT_TYPE = "grant_type";
    public static final String PARAM_CLIENT_ID = "client_id";
    public static final String PARAM_CLIENT_SECRET = "client_secret";
    public static final String PARAM_REQUESTED_SUBJECT = "requested_subject";
    public static final String PARAM_REQUESTED_TOKEN_TYPE = "requested_token_type";
    public static final String PARAM_SUBJECT_TOKEN = "subject_token";

    // OAuth2 Token Types
    public static final String TOKEN_TYPE_ACCESS_TOKEN = "urn:ietf:params:oauth:token-type:access_token";
    public static final String BEARER_PREFIX = "Bearer ";

    // Keycloak Specific Keys
    public static final String KEY_EMAIL_VERIFIED = "emailVerified";
    public static final String KEY_ENABLED = "enabled";
    public static final String KEY_TEMPORARY = "temporary";
    public static final String KEY_TYPE = "type";
    public static final String KEY_VALUE = "value";
    public static final String CREDENTIAL_TYPE_PASSWORD = "password";
}
