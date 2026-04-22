package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.application.dto.request.auth.LoginRequest;
import com.daiphat.accountservice.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.accountservice.application.dto.response.auth.AuthResponse;

public interface LoginServicePort {
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void logout(String refreshToken);
}
