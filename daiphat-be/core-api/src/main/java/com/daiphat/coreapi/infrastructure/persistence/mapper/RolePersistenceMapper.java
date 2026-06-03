package com.daiphat.coreapi.infrastructure.persistence.mapper;

import com.daiphat.coreapi.domain.model.RoleModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.RoleEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        uses = {PermissionPersistenceMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface RolePersistenceMapper {

    RoleModel toDomain(RoleEntity entity);

    @Named("toShallowDomain")
    @Mapping(target = "permissions", ignore = true)
    RoleModel toShallowDomain(RoleEntity entity);

    @Mapping(target = "permissions", ignore = true)
    RoleEntity toEntity(RoleModel domain);
}
