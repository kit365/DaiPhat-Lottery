package com.daiphat.accountservice.application.port.out.auth;

import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;

import java.util.UUID;

public interface KeycloakPort {
    KeycloakAuthResult login(String username, String password);
    void logout(String refreshToken);
    KeycloakAuthResult refreshToken(String refreshToken);
    UUID getUserIdFromToken(String token);
}
