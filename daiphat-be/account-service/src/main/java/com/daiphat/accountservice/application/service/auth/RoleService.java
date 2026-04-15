package com.daiphat.accountservice.application.service.auth;

import com.daiphat.accountservice.application.dto.request.PermissionItemDTO;
import com.daiphat.accountservice.application.dto.request.PermissionRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.RoleResponseDTO;
import com.daiphat.accountservice.application.mapper.RoleApplicationMapper;
import com.daiphat.accountservice.application.port.in.RoleServicePort;
import com.daiphat.accountservice.application.port.out.RoleRepositoryPort;
import com.daiphat.accountservice.domain.exception.DomainException;
import com.daiphat.accountservice.domain.exception.ErrorCode;
import com.daiphat.accountservice.domain.model.PermissionModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.enums.PermissionConstants;
import com.daiphat.accountservice.domain.model.enums.RoleConstants;
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

    @Override
    public RoleModel getDefaultRole() {
        return roleRepositoryPort.findByCode(RoleConstants.ROLE_MEMBER)
                .orElseThrow(() -> new DomainException(ErrorCode.INTERNAL_SERVER_ERROR));
    }

    @Override
    public List<RoleResponseDTO> getAllRoles() {
        return roleRepositoryPort.findAll().stream()
                .filter(role -> !role.getCode().equals(RoleConstants.ADMIN)
                        && !role.getCode().equals(RoleConstants.ROLE_MEMBER))
                .sorted(java.util.Comparator.comparing(RoleModel::getName, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .map(roleApplicationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public RoleResponseDTO updatePermissions(UUID roleId, Set<String> permissionCodes) {
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
    public void registerPermissions(PermissionRegistrationRequestDTO request) {
        if (request == null || request.getPermissions() == null)
            return;
        roleRepositoryPort.upsertPermissions(request.getPermissions());
    }

    @Override
    @Transactional
    public void syncAdminPermissions() {
        roleRepositoryPort.assignAllPermissionsToRole(RoleConstants.ADMIN);
    }

    @Override
    @Transactional
    public void initializeTestAccounts() {
        // Disabled to prevent overwriting manual database changes on restart
    }

    @Override
    public List<PermissionItemDTO> getAllPermissions() {
        return roleRepositoryPort.findAllPermissions().stream()
                .filter(p -> !p.getCode().startsWith(PermissionConstants.ROLE))
                .sorted(java.util.Comparator.comparing(
                        com.daiphat.accountservice.domain.model.PermissionModel::getPosition,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .map(p -> PermissionItemDTO.builder()
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
