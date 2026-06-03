package com.daiphat.coreapi.infrastructure.persistence.mapper;

import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        uses = {RolePersistenceMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface UserPersistenceMapper {

    @Mapping(target = "phone", source = "phoneNumber")
    @Mapping(target = "status", source = "status")
    UserEntity toEntity(UserModel domain);

    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "role", source = "role", qualifiedByName = "toShallowDomain")
    UserModel toDomain(UserEntity entity);

    @Mapping(target = "phoneNumber", source = "phone")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "role", source = "role")
    UserModel toDomainWithRolePermissions(UserEntity entity);

}
