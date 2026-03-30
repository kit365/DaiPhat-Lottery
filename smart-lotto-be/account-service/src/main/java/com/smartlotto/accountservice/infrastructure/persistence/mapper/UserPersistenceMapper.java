package com.smartlotto.accountservice.infrastructure.persistence.mapper;

import com.smartlotto.accountservice.domain.model.UserModel;
import com.smartlotto.accountservice.infrastructure.persistence.entity.UserEntity;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
        uses = {RolePersistenceMapper.class, UserImagePersistenceMapper.class, UserAddressPersistenceMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserPersistenceMapper {

    UserModel toDomain(UserEntity entity);

    UserEntity toEntity(UserModel domain);


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
