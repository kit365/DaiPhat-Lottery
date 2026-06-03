package com.daiphat.coreapi.application.port.in.user;

public interface UserValidationServicePort {
    void ensureEmailAvailable(String email, String currentEmail);
    void ensurePhoneAvailable(String phone, String currentPhone);
    void ensureUsernameAvailable(String username, String currentUsername);
    void validatePasswordMatch(String password, String confirmPassword);
    void validateProfileSetup(String requestPhone, String currentPhone);
}
