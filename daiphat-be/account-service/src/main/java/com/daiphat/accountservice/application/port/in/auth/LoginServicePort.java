package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;

public interface LoginServicePort {
    AuthResponseDTO login(LoginRequestDTO request);
    AuthResponseDTO refreshToken(RefreshTokenRequestDTO request);
    void logout(String refreshToken);
}
