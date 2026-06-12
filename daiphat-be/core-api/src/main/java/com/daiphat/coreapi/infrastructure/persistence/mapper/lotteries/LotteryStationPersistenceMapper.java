package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
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
public interface LotteryStationPersistenceMapper {

    @Mapping(target = "approvedBy", source = "approvedById", qualifiedByName = "uuidToUserEntity")
    LotteryStationEntity toEntity(LotteryStationModel model);

    @Mapping(target = "approvedById", source = "approvedBy", qualifiedByName = "userEntityToUuid")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "createdBy", source = "createdBy")
    LotteryStationModel toDomain(LotteryStationEntity entity);

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
