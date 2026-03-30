package com.smartlotto.accountservice.infrastructure.persistence.mapper;

import com.smartlotto.accountservice.domain.model.UserImageModel;
import com.smartlotto.accountservice.infrastructure.persistence.entity.UserImageEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserImagePersistenceMapper {

    @Mapping(target = "userId", source = "user.id")
    UserImageModel toDomain(UserImageEntity entity);

    @Mapping(target = "user", ignore = true)
    UserImageEntity toEntity(UserImageModel domain);
}
