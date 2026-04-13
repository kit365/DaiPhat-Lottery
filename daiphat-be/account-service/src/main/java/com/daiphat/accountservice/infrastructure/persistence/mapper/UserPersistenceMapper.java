package com.daiphat.accountservice.infrastructure.persistence.mapper;

import com.daiphat.accountservice.domain.model.UserModel;
import com.daiphat.accountservice.infrastructure.persistence.entity.UserEntity;
import org.mapstruct.*;

@Mapper(componentModel = "spring",
        uses = {RolePersistenceMapper.class, UserImagePersistenceMapper.class, UserAddressPersistenceMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserPersistenceMapper {

    @Mapping(target = "phone", source = "phoneNumber")
    UserEntity toEntity(UserModel domain);

    @Mapping(target = "phoneNumber", source = "phone")
    UserModel toDomain(UserEntity entity);


    @AfterMapping
    default void linkRelationships(@MappingTarget UserEntity entity) {
        if (entity.getImages() != null) {
            entity.getImages().forEach(image -> image.setUser(entity));
        }
        if (entity.getAddresses() != null) {
            entity.getAddresses().forEach(address -> address.setUser(entity));
        }
    }
}
