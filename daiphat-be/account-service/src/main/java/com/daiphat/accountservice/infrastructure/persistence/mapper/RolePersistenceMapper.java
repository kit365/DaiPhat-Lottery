package com.daiphat.accountservice.infrastructure.persistence.mapper;

import com.daiphat.accountservice.domain.model.PermissionModel;
import com.daiphat.accountservice.domain.model.RoleModel;
import com.daiphat.accountservice.infrastructure.persistence.entity.PermissionEntity;
import com.daiphat.accountservice.infrastructure.persistence.entity.RoleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface RolePersistenceMapper {

    @Mapping(target = "permissions", source = "permissions", qualifiedByName = "toPermissionModelSet")
    RoleModel toDomain(RoleEntity entity);

    @Mapping(target = "permissions", ignore = true) // Will be handled manually in repository or service to fetch from DB
    RoleEntity toEntity(RoleModel domain);

    @Named("toPermissionModelSet")
    default Set<PermissionModel> toPermissionModelSet(Set<PermissionEntity> entities) {
        if (entities == null) return Collections.emptySet();
        return entities.stream()
                .map(this::toPermissionModel)
                .collect(Collectors.toSet());
    }

    default PermissionModel toPermissionModel(PermissionEntity entity) {
        if (entity == null) return null;
        return PermissionModel.builder()
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .module(entity.getModule())
                .position(entity.getPosition())
                .build();
    }
}
