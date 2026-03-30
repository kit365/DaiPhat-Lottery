package com.smartlotto.accountservice.application.port.in;

import com.smartlotto.accountservice.application.dto.request.LoginRequestDTO;
import com.smartlotto.accountservice.application.dto.request.LogoutRequestDTO;
import com.smartlotto.accountservice.application.dto.request.RefreshTokenRequestDTO;
import com.smartlotto.accountservice.application.dto.response.AuthResponseDTO;

public interface AuthServicePort {
    AuthResponseDTO login(LoginRequestDTO request);
    void logout(LogoutRequestDTO request);
    AuthResponseDTO refreshToken(RefreshTokenRequestDTO request);
}
