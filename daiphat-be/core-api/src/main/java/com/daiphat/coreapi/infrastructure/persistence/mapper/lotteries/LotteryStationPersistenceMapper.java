package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryRegionEntity;
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
    @Mapping(target = "region", source = "region", qualifiedByName = "regionModelToEntity")
    LotteryStationEntity toEntity(LotteryStationModel model);

    @Mapping(target = "approvedById", source = "approvedBy", qualifiedByName = "userEntityToUuid")
    @Mapping(target = "region", source = "region", qualifiedByName = "regionEntityToModel")
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

    @Named("regionEntityToModel")
    default LotteryRegionModel regionEntityToModel(LotteryRegionEntity entity) {
        if (entity == null) {
            return null;
        }
        return LotteryRegionModel.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .type(entity.getType())
                .minNumber(entity.getMinNumber())
                .maxNumber(entity.getMaxNumber())
                .stationCount(entity.getStationCount())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    @Named("regionModelToEntity")
    default LotteryRegionEntity regionModelToEntity(LotteryRegionModel model) {
        if (model == null) {
            return null;
        }
        LotteryRegionEntity entity = new LotteryRegionEntity();
        entity.setId(model.getId());
        entity.setCode(model.getCode());
        entity.setName(model.getName());
        entity.setType(model.getType());
        entity.setMinNumber(model.getMinNumber());
        entity.setMaxNumber(model.getMaxNumber());
        entity.setStationCount(model.getStationCount());
        return entity;
    }
}
