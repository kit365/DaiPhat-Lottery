package com.daiphat.accountservice.application.port.in;

import com.daiphat.accountservice.application.dto.request.PermissionRegistrationRequestDTO;
import com.daiphat.accountservice.application.dto.response.RoleResponseDTO;
import com.daiphat.accountservice.domain.model.RoleModel;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface RoleServicePort {
    RoleModel getDefaultRole();
    List<RoleResponseDTO> getAllRoles();
    RoleResponseDTO updatePermissions(UUID roleId, Set<String> permissionCodes);
    void registerPermissions(PermissionRegistrationRequestDTO request);
    void syncAdminPermissions();
    void initializeTestAccounts();
    List<com.daiphat.accountservice.application.dto.request.PermissionItemDTO> getAllPermissions();
    void reorderPermissions(java.util.Map<String, Integer> positionMap);
}
