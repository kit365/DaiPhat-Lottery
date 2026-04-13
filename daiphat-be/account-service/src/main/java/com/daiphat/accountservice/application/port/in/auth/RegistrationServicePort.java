package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.application.dto.request.UserRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.AuthResponseDTO;

public interface RegistrationServicePort {
    void register(UserRegistrationRequestDTO request);

    void verifyEmail(String token);
    void resendVerificationEmail(String email);
}
