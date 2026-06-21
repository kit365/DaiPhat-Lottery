package com.daiphat.coreapi.application.service.user;

import com.daiphat.coreapi.application.dto.request.AcceptInviteRequest;
import com.daiphat.coreapi.application.dto.request.InviteStaffRequest;
import com.daiphat.coreapi.application.dto.request.user.CreateUserRequest;
import com.daiphat.coreapi.application.dto.request.user.ProfileSetupRequest;
import com.daiphat.coreapi.application.dto.request.user.UpdateUserRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.user.UserResponse;
import com.daiphat.coreapi.application.dto.response.user.UserStatusResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.StaffInviteEvent;
import com.daiphat.coreapi.application.event.UserCreatedEvent;
import com.daiphat.coreapi.application.mapper.UserApplicationMapper;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.in.user.UserServicePort;
import com.daiphat.coreapi.application.port.in.user.UserValidationServicePort;
import com.daiphat.coreapi.application.port.out.auth.PasswordHashPort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.auth.InviteCachePort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.InviteData;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.shared.util.AuthUtils;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import com.daiphat.coreapi.shared.util.StorageUtils;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserServicePort {

    private final UserRepositoryPort userRepositoryPort;
    private final UserApplicationMapper userApplicationMapper;
    private final RoleRepositoryPort roleRepositoryPort;
    private final PasswordHashPort passwordHashPort;
    private final StoragePort storagePort;
    private final ApplicationEventPublisher eventPublisher;
    private final InviteCachePort inviteCachePort;
    private final UserLookupServicePort userLookupService;
    private final UserValidationServicePort userValidationService;

    @Value("${daiphat.auth.cache.invite-ttl-seconds}")
    private long inviteTtlSeconds;

    @Override
    @Transactional
    public void create(CreateUserRequest request) {
        log.info("Admin creating new user with email: {}", request.email());

        userValidationService.ensureEmailAvailable(request.email(), null);
        userValidationService.ensurePhoneAvailable(request.phone(), null);

        String generatedPassword = AuthUtils.generatePassword();

        UserModel user = userApplicationMapper.toUserModel(request);
        user.onboardAdminCreatedUser();
        
        // Hash and save password locally (No External Keycloak API used)
        user.setPassword(passwordHashPort.encode(generatedPassword));
        user.setHasPassword(true);

        String roleToAssign = resolveRoleCode(request.roleCode(), request.roles(), RoleConstants.ROLE_MEMBER);
        assignRoleToUser(user, roleToAssign);

        userRepositoryPort.save(user);

        eventPublisher.publishEvent(UserCreatedEvent.builder()
                .email(request.email())
                .fullName(user.getFullName())
                .password(generatedPassword)
                .build());
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
        
        updateIfPresent(request.gender(), user::setGender);
        if (request.dob() != null) {
            user.setDob(request.dob());
        }
        
        UserStatus newStatus = UserStatus.from(request.status());
        if (newStatus != null) user.setStatus(newStatus);

        if (request.avatar() != null) {
            user.replaceAvatar(user.getImagePublicId(), request.avatar());
        }
        
        String roleCode = resolveRoleCode(request.roleCode(), request.roles(), null);
        if (roleCode != null) {
            assignRoleToUser(user, roleCode);
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
    @Transactional(readOnly = true)
    public UserResponse getMyProfile(String username) {
        // Direct local DB fetch, no keycloak synchronization needed
        return userLookupService.findByUsername(username)
                .map(userApplicationMapper::mapToUserResponse)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserStatusResponse> getStatuses() {
        return EnumOptionUtils.toCodeLabelResponses(UserStatus.values(), UserStatusResponse::new);
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
    public List<UserResponse> searchCustomers(String query, int limit) {
        String normalizedQuery = query == null ? "" : query.trim();
        if (normalizedQuery.isBlank()) {
            return List.of();
        }

        int normalizedLimit = Math.max(1, Math.min(limit, 20));
        String searchValue = normalizedQuery.toLowerCase();

        return userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ROLE_MEMBER)).stream()
                .filter(user -> matchesCustomerSearch(user, searchValue))
                .sorted((left, right) -> compareCustomerSearch(left, right, searchValue))
                .limit(normalizedLimit)
                .map(userApplicationMapper::mapToUserResponse)
                .toList();
    }

    private boolean matchesCustomerSearch(UserModel user, String searchValue) {
        if (user == null) {
            return false;
        }

        String fullName = user.getFullName() == null ? "" : user.getFullName().toLowerCase();
        String email = user.getEmail() == null ? "" : user.getEmail().toLowerCase();
        String phone = user.getPhoneNumber() == null ? "" : user.getPhoneNumber().toLowerCase();
        String username = user.getUsername() == null ? "" : user.getUsername().toLowerCase();

        return fullName.contains(searchValue)
                || email.contains(searchValue)
                || phone.contains(searchValue)
                || username.contains(searchValue);
    }

    private int compareCustomerSearch(UserModel left, UserModel right, String searchValue) {
        int leftScore = customerSearchScore(left, searchValue);
        int rightScore = customerSearchScore(right, searchValue);
        if (leftScore != rightScore) {
            return Integer.compare(leftScore, rightScore);
        }

        String leftName = left == null || left.getFullName() == null ? "" : left.getFullName();
        String rightName = right == null || right.getFullName() == null ? "" : right.getFullName();
        return leftName.compareToIgnoreCase(rightName);
    }

    private int customerSearchScore(UserModel user, String searchValue) {
        if (user == null) {
            return Integer.MAX_VALUE;
        }

        String fullName = user.getFullName() == null ? "" : user.getFullName().toLowerCase();
        String email = user.getEmail() == null ? "" : user.getEmail().toLowerCase();
        String phone = user.getPhoneNumber() == null ? "" : user.getPhoneNumber().toLowerCase();
        String username = user.getUsername() == null ? "" : user.getUsername().toLowerCase();

        if (email.equals(searchValue)) {
            return 0;
        }
        if (phone.equals(searchValue)) {
            return 1;
        }
        if (fullName.startsWith(searchValue)) {
            return 2;
        }
        if (phone.startsWith(searchValue)) {
            return 3;
        }
        if (email.startsWith(searchValue)) {
            return 4;
        }
        if (username.startsWith(searchValue)) {
            return 5;
        }
        if (email.contains(searchValue)) {
            return 6;
        }
        return 7;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAll(int page, int size, String search, String status, List<String> roleIds, String sortBy, String direction) {
        UserStatus userStatus = UserStatus.fromFilter(status);

        Sort sort = SortUtils.createSort(sortBy, direction);

        Page<UserModel> userPage = userRepositoryPort.findAll(
                PageableUtils.of(page, size, sort),
                search,
                userStatus,
                roleIds
        );

        return PageResponse.from(
                userPage.map(userApplicationMapper::mapToUserResponse),
                page,
                size,
                buildStatusCounts(search, roleIds)
        );
    }

    private Map<String, Long> buildStatusCounts(String search, List<String> roleIds) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, userRepositoryPort.countAll(search, roleIds));
        Arrays.stream(UserStatus.values())
                .forEach(status -> counts.put(
                        status.getCode(),
                        userRepositoryPort.countByStatus(status, search, roleIds)
                ));
        return counts;
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

        syncPasswordIfProvided(user, request.getPassword());

        user.completeFirstTimeProfile(
                (request.getPhoneNumber() != null && !request.getPhoneNumber().isBlank()) ? request.getPhoneNumber() : user.getPhoneNumber(),
                request.isAgreedToTerms()
        );
        
        updateIfPresent(request.getGender(), user::setGender);
        if (request.getDob() != null) {
            user.setDob(request.getDob());
        }

        log.info("Successfully finalized first-time profile setup for user: {}", username);
        userRepositoryPort.save(user);
    }

    @Override
    @Transactional
    public UserResponse uploadAvatar(UUID id, UploadRequest request) {
        UserModel user = userLookupService.findByIdOrThrow(id);
        StorageUtils.validateImageUpload(request);

        String oldPublicId = user.getImagePublicId();
        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.PROFILE_IMAGE_FOLDER
        ));

        if (oldPublicId != null && !oldPublicId.isBlank()) {
            storagePort.delete(oldPublicId);
        }

        user.replaceAvatar(result.publicId(), result.url());
        return userApplicationMapper.mapToUserResponse(userRepositoryPort.save(user));
    }

    @Override
    @Transactional
    public UserResponse deleteAvatar(UUID id) {
        UserModel user = userLookupService.findByIdOrThrow(id);

        String oldPublicId = user.getImagePublicId();
        if (oldPublicId != null && !oldPublicId.isBlank()) {
            storagePort.delete(oldPublicId);
        }

        user.clearAvatar();
        return userApplicationMapper.mapToUserResponse(userRepositoryPort.save(user));
    }

    @Override
    @Transactional
    public void inviteStaff(String id, InviteStaffRequest request) {
        log.info("Inviting staff member with email/id: {} for role: {}", id, request.getRoleCode());
        
        UserModel user;
        try {
            UUID uuid = UUID.fromString(id);
            user = userLookupService.findByIdOrThrow(uuid);
        } catch (IllegalArgumentException e) {
            user = userLookupService.findByUsernameOrEmailOrThrow(id);
        }

        roleRepositoryPort.findByCode(request.getRoleCode())
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));

        // Generate a token and save to cache (24 hours expiry)
        String inviteToken = UUID.randomUUID().toString();
        inviteCachePort.saveInvite(inviteToken, user.getId(), request.getRoleCode(), Duration.ofSeconds(inviteTtlSeconds));
        
        UUID currentUserId = null;
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
                currentUserId = userLookupService.findByUsername(auth.getName())
                        .map(UserModel::getId)
                        .orElse(null);
            }
        } catch (Exception e) {
            log.warn("Failed to get current user ID: {}", e.getMessage());
        }

        String oldInviteToken = userRepositoryPort.findStaffInviteTokenByEmail(user.getEmail()).orElse(null);
        if (oldInviteToken != null) {
            log.info("Invalidating old active invite token: {}", oldInviteToken);
            try {
                inviteCachePort.deleteInvite(oldInviteToken);
            } catch (Exception e) {
                log.warn("Failed to delete old invite token from cache: {}", e.getMessage());
            }
        }

        LocalDateTime now = LocalDateTime.now();
        userRepositoryPort.savePendingStaffInvite(
                user.getEmail(),
                request.getRoleCode(),
                inviteToken,
                currentUserId,
                now,
                now.plusSeconds(inviteTtlSeconds)
        );
        log.info("Successfully saved staff invite record to DB for email: {}", user.getEmail());

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
        
        InviteData inviteData = inviteCachePort.getInvite(request.getToken())
                .orElseThrow(() -> new DomainException(ErrorCode.INVITATION_INVALID));

        UserModel user = userLookupService.findByIdOrThrow(inviteData.userId());

        user.activate();

        assignRoleToUser(user, inviteData.role());

        userRepositoryPort.save(user);

        userRepositoryPort.approveStaffInviteByToken(request.getToken());

        inviteCachePort.deleteInvite(request.getToken());
        
        log.info("User {} successfully accepted invite and assigned role {}", user.getEmail(), inviteData.role());
    }

    @Override
    @Transactional
    public void updateFcmToken(UUID userId, String fcmToken) {
        UserModel user = userRepositoryPort.findById(userId)
                .orElseThrow(() -> new DomainException(ErrorCode.USER_NOT_FOUND));

        user.updateFcmToken(fcmToken);
        userRepositoryPort.save(user);

        log.info("Successfully updated FCM token for userId: {}", userId);
    }

    private void assignRoleToUser(UserModel user, String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return;
        }

        RoleModel role = roleRepositoryPort.findByCode(roleCode)
            .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
        
        user.setRole(role);
    }

    private String resolveRoleCode(String roleCode, List<String> roles, String fallback) {
        if (roleCode != null && !roleCode.isBlank()) {
            return roleCode;
        }
        if (roles != null && !roles.isEmpty() && roles.getFirst() != null && !roles.getFirst().isBlank()) {
            return roles.getFirst();
        }
        return fallback;
    }

    private void syncPasswordIfProvided(UserModel user, String password) {
        if (password != null && !password.isBlank()) {
            user.setPassword(passwordHashPort.encode(password));
            user.setHasPassword(true);
            log.info("Successfully hashed local password for user profile setup: {}", user.getId());
        }
    }

    private void updateIfPresent(String newValue, java.util.function.Consumer<String> setter) {
        if (newValue != null && !newValue.isBlank()) {
            setter.accept(newValue);
        }
    }



}
