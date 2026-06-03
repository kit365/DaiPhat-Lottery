package com.daiphat.coreapi.application.port.in.auth;

import com.daiphat.coreapi.application.dto.request.auth.LoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.GoogleLoginRequest;
import com.daiphat.coreapi.application.dto.request.auth.RefreshTokenRequest;
import com.daiphat.coreapi.application.dto.response.auth.AuthResponse;
import jakarta.validation.Valid;

public interface LoginServicePort {
    AuthResponse login(LoginRequest request);

    AuthResponse loginWithGoogle(GoogleLoginRequest request);

    AuthResponse refreshToken(@Valid RefreshTokenRequest request);

    void logout(String refreshToken);
}
