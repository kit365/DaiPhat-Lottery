package com.daiphat.accountservice.application.port.in;

import com.daiphat.accountservice.application.dto.request.LoginRequestDTO;
import com.daiphat.accountservice.application.dto.request.LogoutRequestDTO;
import com.daiphat.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;

public interface AuthServicePort {
    AuthResponseDTO login(LoginRequestDTO request);
    void logout(LogoutRequestDTO request);
    AuthResponseDTO refreshToken(RefreshTokenRequestDTO request);
    void register(UserRegistrationRequestDTO request);
}
