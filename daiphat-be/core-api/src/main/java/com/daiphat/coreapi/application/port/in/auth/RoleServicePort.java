package com.daiphat.coreapi.application.port.in.auth;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.dto.request.permission.PermissionRegistrationRequest;
import com.daiphat.coreapi.application.dto.response.auth.RoleResponse;
import com.daiphat.coreapi.domain.model.RoleModel;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface RoleServicePort {
    RoleModel getDefaultRole();
    RoleModel getRoleByCode(String code);
    List<RoleResponse> getAllRoles();
    RoleResponse updatePermissions(UUID roleId, Set<String> permissionCodes);
    void registerPermissions(PermissionRegistrationRequest request);
    void syncAdminPermissions();
    void initializeTestAccounts();
    List<PermissionItem> getAllPermissions();
    void reorderPermissions(java.util.Map<String, Integer> positionMap);
}
