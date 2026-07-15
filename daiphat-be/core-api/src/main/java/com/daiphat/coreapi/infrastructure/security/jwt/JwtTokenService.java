package com.daiphat.coreapi.infrastructure.security.jwt;

import com.daiphat.coreapi.application.port.out.auth.TokenProviderPort;
import com.daiphat.coreapi.domain.model.UserModel;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenService implements TokenProviderPort {

    private static final String TOKEN_TYPE = "token_type";
    private static final String ACCESS_TOKEN = "access";
    private static final String REFRESH_TOKEN = "refresh";
    private static final String AUTH_VERSION = "auth_version";

    @Value("${daiphat.auth.jwt.secret}")
    private String secret;

    @Value("${daiphat.auth.jwt.issuer}")
    private String issuer;

    @Value("${daiphat.auth.jwt.access-token-ttl-seconds}")
    private long accessTokenTtlSeconds;

    @Value("${daiphat.auth.jwt.refresh-token-ttl-seconds}")
    private long refreshTokenTtlSeconds;

    @Override
    public String generateAccessToken(UserModel user) {
        return generateToken(user, ACCESS_TOKEN, accessTokenTtlSeconds);
    }

    @Override
    public String generateRefreshToken(UserModel user) {
        return generateToken(user, REFRESH_TOKEN, refreshTokenTtlSeconds);
    }

    @Override
    public String extractUsernameFromAccessToken(String token) {
        return parseToken(token, ACCESS_TOKEN).getSubject();
    }

    @Override
    public String extractUsernameFromRefreshToken(String token) {
        return parseToken(token, REFRESH_TOKEN).getSubject();
    }

    @Override
    public boolean isAccessTokenValid(String token) {
        return isTokenValid(token, ACCESS_TOKEN);
    }

    @Override
    public boolean isAccessTokenValidForUser(String token, UserModel user) {
        return isTokenValidForUser(token, ACCESS_TOKEN, user);
    }

    @Override
    public boolean isRefreshTokenValidForUser(String token, UserModel user) {
        return isTokenValidForUser(token, REFRESH_TOKEN, user);
    }

    private boolean isTokenValidForUser(String token, String tokenType, UserModel user) {
        try {
            Claims claims = parseToken(token, tokenType);
            Object authVersionClaim = claims.get(AUTH_VERSION);
            String userId = claims.get("user_id", String.class);
            return authVersionClaim instanceof Number authVersion
                    && authVersion.longValue() == user.getAuthVersion()
                    && user.getId().toString().equals(userId)
                    && user.getUsername().equals(claims.getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    @Override
    public boolean isRefreshTokenValid(String token) {
        return isTokenValid(token, REFRESH_TOKEN);
    }

    @Override
    public long getAccessTokenTtlSeconds() {
        return accessTokenTtlSeconds;
    }

    @Override
    public long getRefreshTokenTtlSeconds() {
        return refreshTokenTtlSeconds;
    }

    private String generateToken(UserModel user, String tokenType, long ttlSeconds) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(ttlSeconds);

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(issuer)
                .subject(user.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .claim(TOKEN_TYPE, tokenType)
                .claim("user_id", user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole() != null ? user.getRole().getCode() : null)
                .claim(AUTH_VERSION, user.getAuthVersion())
                .signWith(signingKey())
                .compact();
    }

    private boolean isTokenValid(String token, String expectedTokenType) {
        try {
            parseToken(token, expectedTokenType);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    private Claims parseToken(String token, String expectedTokenType) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey())
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String tokenType = claims.get(TOKEN_TYPE, String.class);
        if (!expectedTokenType.equals(tokenType)) {
            throw new JwtException("Invalid token type");
        }

        return claims;
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
