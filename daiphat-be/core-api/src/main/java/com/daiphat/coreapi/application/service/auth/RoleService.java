package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.dto.request.permission.PermissionRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.RoleResponse;
import com.daiphat.coreapi.application.mapper.RoleApplicationMapper;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.auth.PermissionModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.enums.auth.AppPermission;
import com.daiphat.coreapi.domain.model.enums.auth.PermissionConstants;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Collections;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService implements RoleServicePort {

    private static final Map<String, Integer> SYSTEM_ROLE_ORDER = buildSystemRoleOrder();

    private final RoleRepositoryPort roleRepositoryPort;
    private final RoleApplicationMapper roleApplicationMapper;
    private final UserLookupServicePort userLookupServicePort;

    @Override
    public RoleModel getDefaultRole() {
        return roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)
                .orElseThrow(() -> new DomainException(ErrorCode.INTERNAL_SERVER_ERROR));
    }

    @Override
    public RoleModel getRoleByCode(String code) {
        return roleRepositoryPort.findByCode(code)
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));
    }

    @Override
    public List<RoleResponse> getAllRoles() {
        return roleRepositoryPort.findAll().stream()
                .filter(this::isManageableRole)
                .sorted(roleComparator())
                .map(roleApplicationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public RoleResponse updatePermissions(UUID roleId, Set<String> permissionCodes) {
        RoleModel role = roleRepositoryPort.findAll().stream()
                .filter(r -> r.getId().equals(roleId))
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND));

        Set<PermissionModel> permissions = permissionCodes.stream()
                .map(code -> PermissionModel.builder().code(code).build())
                .collect(Collectors.toSet());

        role.setPermissions(permissions);
        return roleApplicationMapper.toResponse(roleRepositoryPort.save(role));
    }

    @Override
    @Transactional
    public void registerPermissions(PermissionRegistrationRequest request) {
        if (request == null || request.getPermissions() == null) {
            return;
        }
        roleRepositoryPort.upsertPermissions(request.getPermissions());
    }

    @Override
    @Transactional
    public void syncAdminPermissions() {
        roleRepositoryPort.assignAllPermissionsToRole(RoleConstants.ADMIN);
    }

    @Override
    @Transactional
    public void syncOperatorStaffPermissions() {
        RoleModel role = roleRepositoryPort.findByCode(RoleConstants.ROLE_STAFF_OPERATOR)
                .orElse(null);
        if (role != null) {
            Set<String> permissionCodes = Arrays.stream(AppPermission.values())
                    .filter(AppPermission::isDefaultOperatorPermission)
                    .map(AppPermission::getCode)
                    .collect(Collectors.toUnmodifiableSet());
            roleRepositoryPort.assignPermissionsToRole(RoleConstants.ROLE_STAFF_OPERATOR, permissionCodes);
        }
    }

    @Override
    @Transactional
    public void initializeTestAccounts() {
        // Disabled to prevent overwriting manual database changes on restart
    }

    @Override
    public List<PermissionItem> getAllPermissions() {
        return roleRepositoryPort.findAllPermissions().stream()
                .filter(p -> !p.getCode().startsWith(PermissionConstants.ROLE))
                .filter(p -> !isLegacyProviderPermission(p.getCode()))
                .sorted(Comparator.comparing(
                        PermissionModel::getPosition,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(p -> PermissionItem.builder()
                        .code(p.getCode())
                        .name(p.getName())
                        .description(p.getDescription())
                        .module(p.getModule())
                        .position(p.getPosition())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public void reorderPermissions(Map<String, Integer> positionMap) {
        roleRepositoryPort.updatePermissionPositions(positionMap);
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> getUserPermissionCodes(UUID userId) {
        RoleModel role = userLookupServicePort.findActiveByIdOrThrow(userId).getRole();
        if (role == null || role.getPermissions() == null) {
            return Collections.emptySet();
        }

        return role.getPermissions().stream()
                .filter(Objects::nonNull)
                .map(PermissionModel::getCode)
                .collect(Collectors.toSet());
    }

    private boolean isLegacyProviderPermission(String code) {
        return code != null && code.startsWith(PermissionConstants.PROVIDER + ":");
    }

    private Comparator<RoleModel> roleComparator() {
        return Comparator
                .comparingInt(this::resolveRoleOrder)
                .thenComparing(RoleModel::getName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                .thenComparing(RoleModel::getCode, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }

    private int resolveRoleOrder(RoleModel role) {
        if (role == null || role.getCode() == null) {
            return Integer.MAX_VALUE;
        }
        return SYSTEM_ROLE_ORDER.getOrDefault(role.getCode(), Integer.MAX_VALUE);
    }

    private boolean isManageableRole(RoleModel role) {
        if (role == null || role.getCode() == null) {
            return false;
        }

        return !RoleConstants.ADMIN.equals(role.getCode())
                && !RoleConstants.ROLE_MEMBER.equals(role.getCode())
                && !RoleConstants.ROLE_STREET_AGENT.equals(role.getCode());
    }

    private static Map<String, Integer> buildSystemRoleOrder() {
        Map<String, Integer> roleOrder = new LinkedHashMap<>();
        roleOrder.put(RoleConstants.ADMIN, 0);
        roleOrder.put(RoleConstants.ROLE_STAFF_OPERATOR, 1);
        roleOrder.put(RoleConstants.ROLE_STREET_AGENT, 2);
        roleOrder.put(RoleConstants.ROLE_MEMBER, 3);
        return roleOrder;
    }
}
