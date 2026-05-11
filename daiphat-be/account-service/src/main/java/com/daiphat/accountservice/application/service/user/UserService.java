package com.daiphat.accountservice.application.service.user;

import com.daiphat.accountservice.application.config.AuthProperties;
import com.daiphat.accountservice.application.dto.request.user.CreateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.accountservice.application.dto.response.base.PageResponse;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.OAuthProvisioningPort;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.OAuthUserInfo;
import com.daiphat.accountservice.domain.model.enums.RoleConstants;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.daiphat.accountservice.application.event.*;
import com.daiphat.accountservice.application.port.out.auth.cache.OtpCachePort;
import com.daiphat.accountservice.infrastructure.config.security.SecurityUser;
import com.daiphat.accountservice.infrastructure.util.AuthUtils;
import com.daiphat.accountservice.infrastructure.util.SearchConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * User Application Service - Central coordinator for user profile and account operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserServicePort {

    private final UserRepositoryPort userRepositoryPort;
    private final UserApplicationMapper userApplicationMapper;
    private final IdentityManagementPort identityManagementPort;
    private final OAuthProvisioningPort oauthProvisioningPort;
    private final RoleRepositoryPort roleRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;
    private final OtpCachePort otpCachePort;
    private final AuthProperties authProperties;

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        log.info("Admin creating new user with email: {}", request.email());

        // 1. Validate if user exists
        if (userRepositoryPort.existsByEmail(request.email())) {
            throw new DomainException(ErrorCode.EMAIL_EXISTED);
        }

        // 2. Generate random password
        String generatedPassword = AuthUtils.generatePassword();

        // 3. Prepare UserModel
        String firstName = request.firstName();
        String lastName = request.lastName();

        if ((firstName == null || firstName.isBlank()) && request.fullName() != null) {
            String[] parts = request.fullName().trim().split("\\s+", 2);
            firstName = parts.length > 0 ? parts[0] : "";
            lastName = parts.length > 1 ? parts[1] : "";
        }

        UserModel user = UserModel.builder()
                .username(request.email())
                .email(request.email())
                .firstName(firstName)
                .lastName(lastName)
                .phoneNumber(request.phone())
                .status(UserStatus.PENDING)
                .hasPassword(false) // Required to change on first login
                .emailVerified(true)
                .agreedToTerms(true)
                .build();

        // 4. Create in Identity Provider (Keycloak)
        UUID identityId = identityManagementPort.createUser(user, generatedPassword, false);
        user.setId(identityId);

        // 5. Assign Roles
        if (request.roles() != null && !request.roles().isEmpty()) {
            // Set primary role for local DB (take the first one)
            String primaryRoleCode = request.roles().get(0);
            roleRepositoryPort.findByCode(primaryRoleCode).ifPresent(user::setRole);

            request.roles().forEach(role -> {
                try {
                    identityManagementPort.assignRole(identityId, role);
                } catch (Exception e) {
                    log.error("Failed to assign role {} to user {}: {}", role, identityId, e.getMessage());
                }
            });
        }

        // 6. Save to local DB
        if (user.getRole() == null) {
            log.warn("No valid role found for user {}. Assigning default MEMBER role.", request.email());
            roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER).ifPresent(user::setRole);
        }

        UserModel savedUser = userRepositoryPort.save(user);

        // 7. Fire Event (Listener will handle email after commit)
        eventPublisher.publishEvent(UserCreatedEvent.builder()
                .email(request.email())
                .firstName(request.firstName() != null ? request.firstName() : firstName)
                .password(generatedPassword)
                .build());

        return userApplicationMapper.mapToUserResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        UserModel user = userRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        return userApplicationMapper.mapToUserResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getByUsername(String username) {
        UserModel user = userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        return userApplicationMapper.mapToUserResponse(user);
    }

    @Override
    @Transactional
    public UserResponse getMyProfile(String username) {
        return userRepositoryPort.findByUsername(username)
                .map(userApplicationMapper::mapToUserResponse)
                .orElseGet(() -> {
                    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                    log.info("User {} not found in local DB. Checking JIT provisioning context...", username);

                    if (principal instanceof SecurityUser(
                            UUID id, String uname, String email, String fName, String lName, String avatar
                    )) {
                        log.info("JIT Criteria met for user: {}. Provisioning via identity strategy...", uname);
                        OAuthUserInfo userInfo = new OAuthUserInfo(id, uname, email, fName, lName, avatar, "keycloak");

                        UserModel provisionedUser = oauthProvisioningPort.provision(userInfo);
                        return userApplicationMapper.mapToUserResponse(provisionedUser);
                    }

                    log.warn("JIT Provisioning skipped: Principal is not a valid SecurityUser record.");
                    throw new DomainException(ErrorCode.USER_NOT_FOUND);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAll() {
        return userRepositoryPort.findAll().stream()
                .map(userApplicationMapper::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAll(int page, int size, String search, String status, List<String> roleIds, String sortBy, String direction) {
        UserStatus userStatus = null;
        if (status != null && !status.isBlank() && !SearchConstants.FILTER_ALL.equalsIgnoreCase(status)) {
            try {
                userStatus = UserStatus.valueOf(status.toUpperCase());
            } catch (Exception e) {
                log.warn("Invalid status filter: {}", status);
            }
        }

        Sort sort = direction.equalsIgnoreCase(SearchConstants.SORT_ASC)
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();

        Page<UserModel> userPage = userRepositoryPort.findAll(
                PageRequest.of(page - 1, size, sort),
                search,
                userStatus,
                roleIds
        );

        List<UserResponse> recordList = userPage.getContent().stream()
                .map(userApplicationMapper::mapToUserResponse)
                .collect(Collectors.toList());

        return PageResponse.<UserResponse>builder()
                .recordList(recordList)
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(userPage.getTotalElements())
                        .totalPages(userPage.getTotalPages())
                        .currentPage(page)
                        .limit(size)
                        .build())
                .build();
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        if (!userRepositoryPort.existsById(id)) {
            throw new DomainException(ErrorCode.USER_NOT_FOUND);
        }
        userRepositoryPort.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public UserModel fetchActiveUserByUsername(String username) {
        UserModel user = userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_CREDENTIALS));

        user.validateLoginEligibility();
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public UserModel fetchActiveUserById(UUID id) {
        UserModel user = userRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        user.validateLoginEligibility();
        return user;
    }

    @Override
    @Transactional(readOnly = true)
    public UUID getIdByUsername(String username) {
        return userRepositoryPort.findIdByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    @Transactional
    public void setupFirstTimeProfile(String username, ProfileSetupRequest request) {
        UserModel user = userRepositoryPort.findByUsername(username)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        // Update phone number only if provided in request
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            // Check if phone number is already taken by another user
            if (userRepositoryPort.existsByPhone(request.getPhoneNumber()) && !request.getPhoneNumber().equals(user.getPhoneNumber())) {
                log.warn("Phone number {} already exists for another user. Aborting setup for user: {}",
                        request.getPhoneNumber(), username);
                throw new DomainException(ErrorCode.PHONE_EXISTED);
            }
            user.setPhoneNumber(request.getPhoneNumber());
        } else if (user.getPhoneNumber() == null || user.getPhoneNumber().isBlank()) {
            // If not provided and no existing phone, throw error as it's required for new setup
            throw new DomainException(ErrorCode.PHONE_REQUIRED);
        }

        // Synchronize password legacy update to Keycloak Identity Provider if provided
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            log.info("Provisioning updated password to Keycloak for user: {}", username);
            identityManagementPort.resetPassword(user.getId(), request.getPassword(), false);
        } else {
            log.info("Skipping Keycloak password update for user: {} (no password provided)", username);
        }

        // Finalize local profile status
        user.setAgreedToTerms(request.isAgreedToTerms());
        user.setHasPassword(true);
        user.setStatus(UserStatus.ACTIVE);

        log.info("Successfully finalized first-time profile setup for user: {}", username);
        userRepositoryPort.save(user);
    }

    @Override
    @Transactional
    public void changePassword(UUID id, String newPassword) {
        UserModel user = fetchActiveUserById(id);
        identityManagementPort.resetPassword(user.getId(), newPassword, false);
        user.setHasPassword(true);
        userRepositoryPort.save(user);
    }

    @Override
    @Transactional
    public void initiatePasswordReset(UUID id) {
        UserModel user = fetchActiveUserById(id);
        log.info("Admin initiating password reset for user: {}", user.getEmail());

        String otp = AuthUtils.generateOtp();
        otpCachePort.saveOtp(user.getEmail(), otp, authProperties.getCache().getOtpTtl());

        eventPublisher.publishEvent(AdminResetPasswordOtpEvent.builder()
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .otp(otp)
                .build());
    }

    @Override
    @Transactional
    public void confirmPasswordReset(UUID id, String otp, String phoneNumber) {
        UserModel user = fetchActiveUserById(id);
        log.info("Admin confirming password reset for user: {}", user.getEmail());

        String cachedOtp = otpCachePort.getOtp(user.getEmail())
                .orElseThrow(() -> new DomainException(ErrorCode.OTP_EXPIRED));

        if (!cachedOtp.equals(otp)) {
            otpCachePort.incrementOtpAttempt(user.getEmail(), authProperties.getCache().getOtpTtl());
            throw new DomainException(ErrorCode.OTP_INVALID);
        }

        // Optional: Update phone number if provided by Admin
        if (phoneNumber != null && !phoneNumber.isBlank()) {
            if (userRepositoryPort.existsByPhone(phoneNumber) && !phoneNumber.equals(user.getPhoneNumber())) {
                throw new DomainException(ErrorCode.PHONE_EXISTED);
            }
            user.setPhoneNumber(phoneNumber);
        }

        String temporaryPassword = AuthUtils.generatePassword();
        identityManagementPort.resetPassword(user.getId(), temporaryPassword, false);

        user.setHasPassword(false); // Force password change on next login
        userRepositoryPort.save(user);

        otpCachePort.deleteOtp(user.getEmail());
        otpCachePort.resetOtpAttemptCount(user.getEmail());

        eventPublisher.publishEvent(AdminResetPasswordSuccessEvent.builder()
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .password(temporaryPassword)
                .build());
    }
}
