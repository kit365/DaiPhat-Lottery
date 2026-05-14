package com.daiphat.accountservice.application.service.auth;
import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.request.user.UserRegistrationRequest;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.RegistrationServicePort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.in.auth.RoleServicePort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.application.port.out.auth.cache.VerificationCachePort;
import com.daiphat.accountservice.application.port.out.auth.DistributedLockPort;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthCacheKeyGenerator;
import com.daiphat.accountservice.application.port.out.auth.keys.AuthAction;
import com.daiphat.accountservice.application.port.out.auth.LoginAttemptPort;
import com.daiphat.accountservice.application.port.out.auth.RateLimiterPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.Phone;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.application.event.UserRegisteredEvent;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class RegistrationService implements RegistrationServicePort {

    private final UserRepositoryPort userRepositoryPort;
    private final IdentityManagementPort identityManagementPort;
    private final RoleServicePort roleService;
    private final UserApplicationMapper userApplicationMapper;
    private final VerificationCachePort verificationCachePort;
    private final AuthProperties authProperties;
    private final DistributedLockPort lockManager;
    private final TransactionTemplate transactionTemplate;
    private final LoginAttemptPort loginAttemptPort;
    private final RateLimiterPort rateLimiterPort;
    private final ApplicationEventPublisher eventPublisher;


    @Override
    public void register(UserRegistrationRequest request) {
        log.info("Registering user: {} with email: {}", request.username(), request.email());

        applyDualTierRateLimits(request.email());

        String lockKey = AuthCacheKeyGenerator.registerLock(request.email());
        if (!lockManager.tryLock(lockKey, authProperties.getLockout().getMaxDuration())) {
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, 
                String.valueOf(authProperties.getLockout().getLockTimeout().toSeconds()));
        }

        UUID keycloakId = null;
        String verificationToken = UUID.randomUUID().toString();
        try {
            Phone phone = Phone.of(request.phone());
            validateUserUniqueness(request.username(), request.email(), phone.getValue());

            UserModel userModel = userApplicationMapper.mapToUserModel(request);
            userModel.initializeRegistration();

            // 1. Provision to Keycloak Atomically (Includes Password)
            keycloakId = identityManagementPort.createUser(userModel, request.password(), false);
            userModel.updateKeycloakId(keycloakId);
            log.info("Identity provisioned atomically in Keycloak with ID: {}", keycloakId);

            persistRegistration(userModel, verificationToken, request.username(), request.email());


            eventPublisher.publishEvent(UserRegisteredEvent.builder()
                    .email(request.email())
                    .firstName(request.username())
                    .token(verificationToken)
                    .build());

        } catch (Exception e) {
            log.error("Critical: Failed to complete registration for user: {}. "
                    + "Initiating rollback. Error: {}", 
                request.username(), e.getMessage());
            handleRegistrationFailure(request.username(), keycloakId, verificationToken, e);
            throw e;
        } finally {
            lockManager.unlock(lockKey);
        }
    }

    private void applyDualTierRateLimits(String email) {
        if (!rateLimiterPort.checkAndRecordFixed(email, AuthAction.REGISTER_SPAM, 1, 3)) {
            long retryAfter = rateLimiterPort.getRemainingWaitTimeFixed(email, AuthAction.REGISTER_SPAM, 3);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        if (!rateLimiterPort.checkAndRecord(email, AuthAction.REGISTER)) {
            long retryAfter = rateLimiterPort.getRemainingWaitTime(email, AuthAction.REGISTER);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }
    }


    private void persistRegistration(UserModel userModel, String verificationToken, String username, String email) {
        transactionTemplate.executeWithoutResult(status -> {
            userModel.setRole(roleService.getDefaultRole());
            userModel.setHasPassword(true);
            userRepositoryPort.save(userModel);
            
            verificationCachePort.saveVerificationToken(verificationToken, email, 
                    authProperties.getCache().getVerificationTokenTtl());
            
            loginAttemptPort.recordSuccessfulAttempt(username);
            log.info("Registration persisted locally for user: {}", username);
        });
    }

    @Override
    public void verifyEmail(String token) {
        log.info("Verifying email with token: {}", AuthUtils.maskToken(token));
 
        String email = verificationCachePort.getEmailByVerificationToken(token)
                .orElseThrow(() -> new DomainException(ErrorCode.VERIFY_TOKEN_EXPIRED));

        transactionTemplate.executeWithoutResult(status -> {
            UserModel user = userRepositoryPort.findByEmail(email)
                    .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
 
            if (user.isEmailVerified()) {
                log.info("Email already verified for: {}", email);
                return;
            }
 
            user.setEmailVerified(true);
            user.setStatus(UserStatus.ACTIVE);
            userRepositoryPort.save(user);
            
            log.debug("Local DB updated: User {} is now ACTIVE", email);
        });

        UserModel user = userRepositoryPort.findByEmail(email)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
        
        identityManagementPort.verifyEmail(user.getId());
        verificationCachePort.deleteVerificationToken(token);
        
        log.info("Email verification complete for: {}.", email);
    }

    @Override
    public void resendVerificationEmail(String email) {
        log.info("Requesting to resend verification email for: {}", email);

        // 1. Rate Limit Check (Progressive backoff for resend)
        if (!rateLimiterPort.checkAndRecord(email, AuthAction.RESEND_VERIFICATION)) {
            long retryAfter = rateLimiterPort.getRemainingWaitTime(email, AuthAction.RESEND_VERIFICATION);
            throw new DomainException(ErrorCode.TOO_MANY_REQUESTS, null, String.valueOf(retryAfter));
        }

        // 2. Lookup user to ensure eligibility
        UserModel user = userRepositoryPort.findByEmail(email)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        if (user.isEmailVerified()) {
            log.info("User {} already verified, skipping resend.", email);
            return;
        }

        verificationCachePort.getOldTokenByEmail(email)
                .ifPresent(oldToken -> {
                    log.info("Invalidating old token for resend: {}", email);
                    verificationCachePort.deleteVerificationToken(oldToken);
                });

        // 4. Generate & Dispatch new token
        String newToken = UUID.randomUUID().toString();
        verificationCachePort.saveVerificationToken(newToken, email, 
                authProperties.getCache().getVerificationTokenTtl());

        eventPublisher.publishEvent(UserRegisteredEvent.builder()
                .email(email)
                .firstName(user.getUsername())
                .token(newToken)
                .build());
        log.info("New verification email event dispatched for: {}", email);
    }

    private void validateUserUniqueness(String username, String email, String phone) {
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

    private void handleRegistrationFailure(String username, UUID keycloakId, 
            String verificationToken, Exception originalException) {
        log.warn("CRITICAL: Initiating registration rollback for user: {}. Reason: {}", 
            username, originalException.getMessage());
        
        boolean compensationFailed = false;

        // 1. Rollback Keycloak
        if (keycloakId != null) {
            try {
                identityManagementPort.deleteUser(keycloakId);
                log.info("Rollback SUCCESS: Keycloak user {} deleted", keycloakId);
            } catch (Exception e) {
                log.error("Compensation FATAL: Failed to delete Keycloak user {}", keycloakId, e);
                originalException.addSuppressed(e);
                compensationFailed = true;
            }
        }

        // 2. Rollback Verification Token Cache
        if (verificationToken != null) {
            try {
                verificationCachePort.deleteVerificationToken(verificationToken);
                log.info("Rollback SUCCESS: Verification token purged from cache");
            } catch (Exception e) {
                log.error("Compensation FATAL: Failed to delete verification token", e);
                originalException.addSuppressed(e);
                compensationFailed = true;
            }
        }

        if (compensationFailed) {
            log.error("CRITICAL CONSISTENCY ALERT: Registration compensation failed for {}. "
                    + "Manual intervention required.", username);
        }

        if (originalException instanceof DomainException de) {
            throw de;
        }
        throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, originalException);
    }
}
