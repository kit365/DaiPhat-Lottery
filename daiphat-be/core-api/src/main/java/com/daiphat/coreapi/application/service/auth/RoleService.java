package com.daiphat.coreapi.application.service.auth;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.dto.request.permission.PermissionRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.RoleResponse;
import com.daiphat.coreapi.application.mapper.RoleApplicationMapper;
import com.daiphat.coreapi.application.port.in.auth.RoleServicePort;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.auth.PermissionModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.enums.auth.PermissionConstants;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.application.config.AuthProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoleService implements RoleServicePort {

    private final RoleRepositoryPort roleRepositoryPort;
    private final RoleApplicationMapper roleApplicationMapper;
    private final AuthProperties authProperties;

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
                .filter(role -> !role.getCode().equals(RoleConstants.ADMIN)
                        && !role.getCode().equals(RoleConstants.ROLE_MEMBER))
                .sorted(java.util.Comparator.comparing(RoleModel::getName, 
                        java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
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
                .collect(java.util.stream.Collectors.toSet());

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
        if (role != null && (role.getPermissions() == null || role.getPermissions().isEmpty())) {
            Set<String> permissionCodes = authProperties.getDefaultOperatorPermissions();
            if (permissionCodes != null && !permissionCodes.isEmpty()) {
                roleRepositoryPort.assignPermissionsToRole(RoleConstants.ROLE_STAFF_OPERATOR, permissionCodes);
            }
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
                .sorted(java.util.Comparator.comparing(
                        PermissionModel::getPosition,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
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
    public void reorderPermissions(java.util.Map<String, Integer> positionMap) {
        roleRepositoryPort.updatePermissionPositions(positionMap);
    }
}
