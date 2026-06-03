package com.daiphat.coreapi.application.service.user;

import com.daiphat.coreapi.application.port.in.user.UserValidationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserValidationService implements UserValidationServicePort {

    private final UserRepositoryPort userRepositoryPort;

    @Override
    public void ensureEmailAvailable(String email, String currentEmail) {
        if (email == null || email.isBlank() || email.equalsIgnoreCase(currentEmail)) {
            return;
        }
        if (userRepositoryPort.existsByEmail(email)) {
            throw new DomainException(ErrorCode.EMAIL_EXISTED);
        }
    }

    @Override
    public void ensurePhoneAvailable(String phone, String currentPhone) {
        if (phone == null || phone.isBlank() || phone.equalsIgnoreCase(currentPhone)) {
            return;
        }
        if (userRepositoryPort.existsByPhone(phone)) {
            throw new DomainException(ErrorCode.PHONE_EXISTED);
        }
    }

    @Override
    public void ensureUsernameAvailable(String username, String currentUsername) {
        if (username == null || username.isBlank() || username.equalsIgnoreCase(currentUsername)) {
            return;
        }
        if (userRepositoryPort.existsByUsername(username)) {
            throw new DomainException(ErrorCode.USERNAME_EXISTED);
        }
    }

    @Override
    public void validatePasswordMatch(String password, String confirmPassword) {
        if (password == null || !password.equals(confirmPassword)) {
            throw new DomainException(ErrorCode.PASSWORD_CONFIRM_MISMATCH);
        }
    }

    @Override
    public void validateProfileSetup(String requestPhone, String currentPhone) {
        if ((requestPhone == null || requestPhone.isBlank()) && 
            (currentPhone == null || currentPhone.isBlank())) {
            throw new DomainException(ErrorCode.PHONE_REQUIRED);
        }
    }
}
