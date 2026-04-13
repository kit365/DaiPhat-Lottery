package com.daiphat.accountservice.application.port.out.auth;

import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;

public interface KeycloakPort {
    KeycloakAuthResult login(String username, String password);
    void logout(String refreshToken);
    KeycloakAuthResult refreshToken(String refreshToken);
}
