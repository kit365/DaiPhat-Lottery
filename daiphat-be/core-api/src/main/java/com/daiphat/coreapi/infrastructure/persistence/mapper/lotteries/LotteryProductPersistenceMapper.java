package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryProductModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryProductEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface LotteryProductPersistenceMapper {

    @Mapping(target = "approvedBy", source = "approvedById", qualifiedByName = "uuidToUserEntity")
    LotteryProductEntity toEntity(LotteryProductModel model);

    @Mapping(target = "approvedById", source = "approvedBy", qualifiedByName = "userEntityToUuid")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "createdBy", source = "createdBy")
    LotteryProductModel toDomain(LotteryProductEntity entity);

    @Named("userEntityToUuid")
    default UUID userEntityToUuid(UserEntity user) {
        return user != null ? user.getId() : null;
    }

    @Named("uuidToUserEntity")
    default UserEntity uuidToUserEntity(UUID id) {
        if (id == null) return null;
        UserEntity user = new UserEntity();
        user.setId(id);
        return user;
    }
}