package com.daiphat.accountservice.application.service.user;

import com.daiphat.accountservice.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.application.port.in.auth.OAuthProvisioningPort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.OAuthUserInfo;
import com.daiphat.accountservice.infrastructure.config.security.SecurityUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.daiphat.accountservice.application.dto.response.base.PageResponse;
import com.daiphat.accountservice.domain.model.enums.UserStatus;

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
        if (status != null && !status.isBlank() && !"all".equalsIgnoreCase(status)) {
            try {
                userStatus = UserStatus.valueOf(status.toUpperCase());
            } catch (Exception e) {
                log.warn("Invalid status filter: {}", status);
            }
        }

        org.springframework.data.domain.Sort sort = direction.equalsIgnoreCase("asc") 
                ? org.springframework.data.domain.Sort.by(sortBy).ascending() 
                : org.springframework.data.domain.Sort.by(sortBy).descending();

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

        // Check if phone number is already taken by another user
        if (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) {
            if (userRepositoryPort.existsByPhone(request.getPhoneNumber())) {
                log.warn("Phone number {} already exists for another user. Aborting setup for user: {}", 
                        request.getPhoneNumber(), username);
                throw new DomainException(ErrorCode.PHONE_EXISTED);
            }
        }

        // Synchronize password legacy update to Keycloak Identity Provider if provided
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            log.info("Provisioning updated password to Keycloak for user: {}", username);
            identityManagementPort.resetPassword(user.getId(), request.getPassword());
        } else {
            log.info("Skipping Keycloak password update for user: {} (no password provided)", username);
        }
        
        // Finalize local profile status
        user.setPhoneNumber(request.getPhoneNumber());
        user.setAgreedToTerms(request.isAgreedToTerms());
        user.setHasPassword(true);

        log.info("Successfully finalized first-time profile setup for user: {}", username);
        userRepositoryPort.save(user);
    }
}
