package com.smartlotto.accountservice.application.port.out.auth;

import com.smartlotto.accountservice.application.dto.request.LoginRequestDTO;
import com.smartlotto.accountservice.domain.model.auth.KeycloakAuthResult;

public interface KeycloakPort {
    KeycloakAuthResult login(LoginRequestDTO request);
    void logout(String refreshToken);
    KeycloakAuthResult refreshToken(String refreshToken);
}
