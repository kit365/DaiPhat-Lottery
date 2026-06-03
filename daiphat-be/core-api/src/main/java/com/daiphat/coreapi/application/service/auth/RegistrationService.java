package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.coreapi.application.event.UserRegisteredEvent;
import com.daiphat.coreapi.application.mapper.UserApplicationMapper;
import com.daiphat.coreapi.application.port.in.auth.RegistrationServicePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordHashPort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.application.port.out.auth.VerificationCachePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.valueobject.Phone;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService implements RegistrationServicePort {

    private final UserRepositoryPort userRepositoryPort;
    private final RoleRepositoryPort roleRepositoryPort;
    private final VerificationCachePort verificationCachePort;
    private final ApplicationEventPublisher eventPublisher;
    private final PasswordHashPort passwordHashPort;
    private final UserApplicationMapper userApplicationMapper;

    @Value("${daiphat.auth.cache.verification-token-ttl-seconds}")
    private long verificationTokenTtlSeconds;

    @Override
    @Transactional
    public void register(UserRegistrationRequest request) {
        Phone phone = Phone.of(request.phone());

        ensureRegistrationAvailable(request.username(), request.email(), phone.getValue());

        RoleModel defaultRole = roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));

        UserModel user = userApplicationMapper.mapToUserModel(request);
        user.setPassword(passwordHashPort.encode(request.password()));
        user.onboardSelfRegisteredUser(defaultRole);
        user = userRepositoryPort.save(user);

        String verificationToken = UUID.randomUUID().toString();
        verificationCachePort.saveVerificationToken(
                verificationToken,
                user.getEmail(),
                Duration.ofSeconds(verificationTokenTtlSeconds)
        );
        eventPublisher.publishEvent(UserRegisteredEvent.builder()
                .email(user.getEmail())
                .fullName(user.getFullName())
                .token(verificationToken)
                .build());
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        String email = verificationCachePort.getEmailByVerificationToken(token)
                .orElseThrow(() -> new DomainException(ErrorCode.VERIFY_TOKEN_EXPIRED));

        UserModel user = userRepositoryPort.findByEmail(email)
                .orElseThrow(() -> new DomainException(ErrorCode.EMAIL_NOT_FOUND));
        if (!user.isEmailVerified()) {
            user.activate();
            userRepositoryPort.save(user);
        }
        verificationCachePort.deleteVerificationToken(token);
    }

    @Override
    public void resendVerificationEmail(String email) {
        UserModel user = userRepositoryPort.findByUsernameOrEmail(email)
                .orElseThrow(() -> new DomainException(ErrorCode.EMAIL_NOT_FOUND));
        if (user.isEmailVerified()) {
            return;
        }

        String verificationToken = UUID.randomUUID().toString();
        verificationCachePort.saveVerificationToken(
                verificationToken,
                user.getEmail(),
                Duration.ofSeconds(verificationTokenTtlSeconds)
        );
        eventPublisher.publishEvent(UserRegisteredEvent.builder()
                .email(user.getEmail())
                .fullName(user.getFullName())
                .token(verificationToken)
                .build());
    }

    private void ensureRegistrationAvailable(String username, String email, String phone) {
        if (userRepositoryPort.existsByUsername(username)) {
            throw new DomainException(ErrorCode.USERNAME_EXISTED);
        }
        if (userRepositoryPort.existsByEmail(email)) {
            throw new DomainException(ErrorCode.EMAIL_EXISTED);
        }
        if (userRepositoryPort.existsByPhone(phone)) {
            throw new DomainException(ErrorCode.PHONE_EXISTED);
        }
    }
}
