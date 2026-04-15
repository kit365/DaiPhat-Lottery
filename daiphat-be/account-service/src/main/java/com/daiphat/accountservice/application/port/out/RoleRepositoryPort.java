package com.daiphat.accountservice.application.port.out;

import com.daiphat.accountservice.application.dto.request.PermissionItemDTO;
import com.daiphat.accountservice.application.dto.request.PermissionRegistrationRequestDTO;
import com.daiphat.accountservice.domain.model.RoleModel;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface RoleRepositoryPort {
    Optional<RoleModel> findByCode(String code);
    List<RoleModel> findAll();
    Set<String> findPermissionCodesByRoleCodes(Collection<String> roleCodes);
    RoleModel save(RoleModel role);
    void upsertPermissions(List<PermissionItemDTO> items);
    void assignAllPermissionsToRole(String roleCode);
    void assignPermissionsToRole(String roleCode, Set<String> permissionCodes);
    List<com.daiphat.accountservice.domain.model.PermissionModel> findAllPermissions();
    void updatePermissionPositions(java.util.Map<String, Integer> positionMap);
}
