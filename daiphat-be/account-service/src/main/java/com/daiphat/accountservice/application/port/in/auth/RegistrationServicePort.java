package com.daiphat.accountservice.application.port.in.auth;

import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;

public interface RegistrationServicePort {
    void register(UserRegistrationRequest request);

    void verifyEmail(String token);
    void resendVerificationEmail(String email);
}
