package com.daiphat.coreapi.application.port.out;

import com.daiphat.coreapi.domain.model.UserModel;

public interface TokenProviderPort {
    String generateAccessToken(UserModel user);

    String generateRefreshToken(UserModel user);

    String extractUsernameFromAccessToken(String token);

    String extractUsernameFromRefreshToken(String token);

    boolean isAccessTokenValid(String token);

    boolean isRefreshTokenValid(String token);

    long getAccessTokenTtlSeconds();

    long getRefreshTokenTtlSeconds();
}
