package com.daiphat.accountservice.application.port.out.auth;

import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.domain.model.auth.KeycloakAuthResult;

public interface KeycloakPort {
    KeycloakAuthResult login(LoginRequestDTO request);
    void logout(String refreshToken);
    KeycloakAuthResult refreshToken(String refreshToken);
}
