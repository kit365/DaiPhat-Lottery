package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryScanLogModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryScanLogEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface LotteryScanLogPersistenceMapper {

    @Mapping(target = "scannedBy", source = "scannedBy", qualifiedByName = "userIdToEntity")
    LotteryScanLogEntity toEntity(LotteryScanLogModel model);

    @Mapping(target = "scannedBy", source = "scannedBy.id")
    LotteryScanLogModel toDomain(LotteryScanLogEntity entity);

    @Named("userIdToEntity")
    default UserEntity userIdToEntity(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity entity = new UserEntity();
        entity.setId(userId);
        return entity;
    }
}
