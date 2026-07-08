package com.daiphat.coreapi.infrastructure.adapter.out.auth.persistence;

import com.daiphat.coreapi.application.dto.request.permission.PermissionItem;
import com.daiphat.coreapi.application.port.out.auth.RoleRepositoryPort;
import com.daiphat.coreapi.domain.model.auth.PermissionModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.infrastructure.persistence.entity.auth.PermissionEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.auth.RoleEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.RolePersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.mapper.PermissionPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.PermissionRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RoleRepositoryAdapter implements RoleRepositoryPort {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePersistenceMapper rolePersistenceMapper;
    private final PermissionPersistenceMapper permissionPersistenceMapper;

    @Override
    @Transactional(readOnly = true)
    public Optional<RoleModel> findByCode(String code) {
        return roleRepository.findByCode(code)
                .map(rolePersistenceMapper::toShallowDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleModel> findAll() {
        return roleRepository.findAll().stream()
                .map(rolePersistenceMapper::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Set<String> findPermissionCodesByRoleCodes(Collection<String> roleCodes) {
        return roleRepository.findAllByCodeIn(roleCodes).stream()
                .flatMap(role -> role.getPermissions().stream())
                .map(PermissionEntity::getCode)
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionModel> findAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(permissionPersistenceMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoleModel save(RoleModel role) {
        RoleEntity entity = rolePersistenceMapper.toEntity(role);
        
        if (role.getPermissions() != null) {
            Set<String> permissionCodes = role.getPermissions().stream()
                    .filter(Objects::nonNull)
                    .map(PermissionModel::getCode)
                    .collect(Collectors.toSet());
            
            List<PermissionEntity> permissions = permissionRepository.findAllByCodeIn(permissionCodes);
            entity.setPermissions(new HashSet<>(permissions));
        }

        return rolePersistenceMapper.toDomain(roleRepository.save(entity));
    }

    @Override
    @Transactional
    public void upsertPermissions(List<PermissionItem> items) {
        Set<String> codes = items.stream().map(PermissionItem::getCode).collect(Collectors.toSet());
        
        List<PermissionEntity> allExisting = permissionRepository.findAll();
        List<PermissionEntity> orphans = allExisting.stream()
                .filter(p -> !codes.contains(p.getCode()))
                .toList();
        if (!orphans.isEmpty()) {
            permissionRepository.deleteAll(orphans);
        }

        Map<String, PermissionEntity> existingMap = allExisting.stream()
                .filter(p -> codes.contains(p.getCode()))
                .collect(Collectors.toMap(PermissionEntity::getCode, p -> p));

        List<PermissionEntity> toSave = items.stream().map(item -> {
            PermissionEntity entity = existingMap.getOrDefault(item.getCode(), new PermissionEntity());
            entity.setCode(item.getCode());
            entity.setName(item.getName());
            entity.setDescription(item.getDescription());
            entity.setModule(item.getModule());
            
            if (entity.getId() == null || entity.getPosition() == null) {
                entity.setPosition(item.getPosition());
            }
            return entity;
        }).toList();

        permissionRepository.saveAll(toSave);
    }

    @Override
    @Transactional
    public void updatePermissionPositions(Map<String, Integer> positionMap) {
        if (positionMap == null || positionMap.isEmpty()) {
            return;
        }
        
        List<PermissionEntity> all = permissionRepository.findAll();
        all.forEach(p -> {
            if (positionMap.containsKey(p.getCode())) {
                p.setPosition(positionMap.get(p.getCode()));
            }
        });
        permissionRepository.saveAll(all);
    }

    @Override
    @Transactional
    public void assignAllPermissionsToRole(String roleCode) {
        RoleEntity role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, 
                        "Target initializing role not found: " + roleCode));

        Set<PermissionEntity> allPermissions = new HashSet<>(permissionRepository.findAll());
        role.setPermissions(allPermissions);
        roleRepository.save(role);
    }

    @Override
    @Transactional
    public void assignPermissionsToRole(String roleCode, Set<String> permissionCodes) {
        RoleEntity role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new DomainException(ErrorCode.ROLE_NOT_FOUND, 
                        "Role not found for sync: " + roleCode));

        List<PermissionEntity> permissions = permissionRepository.findAllByCodeIn(permissionCodes);
        role.setPermissions(new HashSet<>(permissions));
        roleRepository.save(role);
    }
}
