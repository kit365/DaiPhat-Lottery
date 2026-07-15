package com.daiphat.coreapi.application.port.out.auth;

import com.daiphat.coreapi.domain.model.UserModel;

public interface TokenProviderPort {
    String generateAccessToken(UserModel user);

    String generateRefreshToken(UserModel user);

    String extractUsernameFromAccessToken(String token);

    String extractUsernameFromRefreshToken(String token);

    boolean isAccessTokenValid(String token);

    boolean isAccessTokenValidForUser(String token, UserModel user);

    boolean isRefreshTokenValid(String token);

    boolean isRefreshTokenValidForUser(String token, UserModel user);

    long getAccessTokenTtlSeconds();

    long getRefreshTokenTtlSeconds();
}
