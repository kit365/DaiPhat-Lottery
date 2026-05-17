package com.daiphat.accountservice.application.service.user;
import com.daiphat.accountservice.application.dto.request.user.CreateUserRequest;
import com.daiphat.accountservice.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.accountservice.application.dto.request.user.UpdateUserRequest;
import com.daiphat.accountservice.application.dto.response.base.PageResponse;
import com.daiphat.accountservice.application.dto.response.user.UserResponse;
import com.daiphat.accountservice.application.mapper.UserApplicationMapper;
import com.daiphat.accountservice.application.port.in.auth.OAuthProvisioningPort;
import com.daiphat.accountservice.application.port.in.user.UserServicePort;
import com.daiphat.accountservice.application.port.out.auth.IdentityManagementPort;
import com.daiphat.accountservice.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.accountservice.application.port.out.user.UserRepositoryPort;
import com.daiphat.accountservice.application.port.in.user.UserLookupServicePort;
import com.daiphat.accountservice.application.port.in.user.UserValidationServicePort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.domain.model.auth.OAuthUserInfo;
import com.daiphat.accountservice.domain.model.enums.RoleConstants;
import com.daiphat.accountservice.domain.model.enums.UserStatus;
import com.daiphat.accountservice.application.event.*;
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
import com.daiphat.accountservice.application.dto.request.InviteStaffRequest;
import com.daiphat.accountservice.application.dto.request.AcceptInviteRequest;
import com.daiphat.accountservice.application.port.out.user.cache.InviteCachePort;
import java.time.Duration;

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
    private final InviteCachePort inviteCachePort;
    private final UserLookupServicePort userLookupService;
    private final UserValidationServicePort userValidationService;


    @Override
    @Transactional
    public void create(CreateUserRequest request) {
        log.info("Admin creating new user with email: {}", request.email());

        userValidationService.ensureEmailAvailable(request.email(), null);
        userValidationService.ensurePhoneAvailable(request.phone(), null);

        String generatedPassword = AuthUtils.generatePassword();

        UserModel user = userApplicationMapper.toUserModel(request);
        user.onboardAdminCreatedUser();

        UUID identityId = identityManagementPort.createUser(user, generatedPassword, false);
        user.setId(identityId);

        try {
            String roleToAssign = (request.roleCode() != null) ? request.roleCode() : RoleConstants.ROLE_MEMBER;
            assignRoleToUser(user, roleToAssign);

            userRepositoryPort.save(user);

            eventPublisher.publishEvent(UserCreatedEvent.builder()
                    .email(request.email())
                    .fullName(user.getFullName())
                    .password(generatedPassword)
                    .build());
        } catch (Exception e) {
            log.error("Failed to complete user creation for {}. Initiating identity compensation (delete). Error: {}", 
                    request.email(), e.getMessage());
            identityManagementPort.deleteUser(identityId);
            throw e;
        }
    }

    @Override
    @Transactional
    public void update(UUID id, UpdateUserRequest request) {
        log.info("Updating user with id: {}", id);
        UserModel user = userLookupService.findByIdOrThrow(id);

        updateIfPresent(request.firstName(), user::setFirstName);
        updateIfPresent(request.lastName(), user::setLastName);
        
        userValidationService.ensurePhoneAvailable(request.phone(), user.getPhoneNumber());

        updateIfPresent(request.phone(), user::setPhoneNumber);
        
        UserStatus newStatus = UserStatus.from(request.status());
        if (newStatus != null) user.setStatus(newStatus);

        if (request.avatar() != null) {
            com.daiphat.accountservice.domain.model.UserImageModel newImage = 
                userApplicationMapper.toUserImageModel(request.avatar(), user.getId());
            user.replaceCurrentAvatar(newImage);
        }
        
        if (request.roleCode() != null) {
            assignRoleToUser(user, request.roleCode());
        }

        userRepositoryPort.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return userApplicationMapper.mapToUserResponse(userLookupService.findByIdOrThrow(id));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getByUsername(String username) {
        return userApplicationMapper.mapToUserResponse(userLookupService.findByUsernameOrThrow(username));
    }


    @Override
    @Transactional
    public UserResponse getMyProfile(String username) {
        return userLookupService.findByUsername(username)
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
        UserStatus userStatus = UserStatus.fromFilter(status);

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
        userLookupService.findByIdOrThrow(id);
        userRepositoryPort.deleteById(id);
    }

    @Override
    @Transactional
    public void setupFirstTimeProfile(String username, ProfileSetupRequest request) {
        UserModel user = userLookupService.findByUsernameOrThrow(username);

        userValidationService.ensurePhoneAvailable(request.getPhoneNumber(), user.getPhoneNumber());
        userValidationService.validateProfileSetup(request.getPhoneNumber(), user.getPhoneNumber());

        syncPasswordIfProvided(user.getId(), request.getPassword());

        user.completeFirstTimeProfile(
                (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) ? request.getPhoneNumber() : user.getPhoneNumber(),
                request.isAgreedToTerms()
        );

        log.info("Successfully finalized first-time profile setup for user: {}", username);
        userRepositoryPort.save(user);
    }

    @Override
    @Transactional
    public void inviteStaff(String id, InviteStaffRequest request) {
        log.info("Inviting staff member with email/id: {} for role: {}", id, request.getRoleCode());
        
        // Special case: Using mixed identifier lookup, primarily for the invitation flow.
        UserModel user = userLookupService.findByIdentifierOrThrow(id);

        // Generate a token and save to cache (24 hours expiry)
        String inviteToken = UUID.randomUUID().toString();
        inviteCachePort.saveInvite(inviteToken, user.getId(), request.getRoleCode(), Duration.ofHours(24));
        
        eventPublisher.publishEvent(StaffInviteEvent.builder()
                .email(user.getEmail())
                .fullName(user.getFullName())
                .token(inviteToken)
                .roleName(request.getRoleCode())
                .build());
    }

    @Override
    @Transactional
    public void acceptInvite(AcceptInviteRequest request) {
        log.info("Accepting staff invitation with token: {}", request.getToken());
        
        InviteCachePort.InviteData inviteData = inviteCachePort.getInvite(request.getToken())
                .orElseThrow(() -> new DomainException(ErrorCode.INVITATION_INVALID));

        UserModel user = userLookupService.findByIdOrThrow(inviteData.userId());

        user.activate();

        assignRoleToUser(user, inviteData.role());

        userRepositoryPort.save(user);

        inviteCachePort.deleteInvite(request.getToken());
        
        log.info("User {} successfully accepted invite and assigned role {}", user.getEmail(), inviteData.role());
    }

    private void assignRoleToUser(UserModel user, String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return;
        }

        RoleModel role = roleRepositoryPort.findByCode(roleCode)
            .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
        
        user.setRole(role);

    
        identityManagementPort.assignRole(user.getId(), List.of(roleCode));
    }


    private void syncPasswordIfProvided(UUID userId, String password) {
        if (password != null && !password.isBlank()) {
            identityManagementPort.resetPassword(userId, password, false);
            log.info("Successfully synced password to identity provider for user: {}", userId);
        }
    }

    private void updateIfPresent(String newValue, java.util.function.Consumer<String> setter) {
        if (newValue != null && !newValue.isBlank()) {
            setter.accept(newValue);
        }
    }
}
