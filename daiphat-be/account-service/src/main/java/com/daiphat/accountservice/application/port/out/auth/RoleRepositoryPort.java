package com.daiphat.accountservice.application.port.out.auth;

import com.daiphat.accountservice.application.dto.request.permission.PermissionItem;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.domain.model.PermissionModel;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.Map;

public interface RoleRepositoryPort {
    Optional<RoleModel> findByCode(String code);

    List<RoleModel> findAll();

    Set<String> findPermissionCodesByRoleCodes(Collection<String> roleCodes);

    RoleModel save(RoleModel role);

    void upsertPermissions(List<PermissionItem> items);

    void assignAllPermissionsToRole(String roleCode);

    void assignPermissionsToRole(String roleCode, Set<String> permissionCodes);

    List<PermissionModel> findAllPermissions();

    void updatePermissionPositions(Map<String, Integer> positionMap);
}
