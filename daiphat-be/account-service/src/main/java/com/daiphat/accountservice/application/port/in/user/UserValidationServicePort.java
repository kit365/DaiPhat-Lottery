package com.daiphat.accountservice.application.port.in.user;

public interface UserValidationServicePort {
    void ensureEmailAvailable(String email, String currentEmail);
    void ensurePhoneAvailable(String phone, String currentPhone);
    void ensureUsernameAvailable(String username, String currentUsername);

    // Business validations
    void validatePasswordMatch(String password, String confirmPassword);
    void validateProfileSetup(String requestPhone, String currentPhone);
}
