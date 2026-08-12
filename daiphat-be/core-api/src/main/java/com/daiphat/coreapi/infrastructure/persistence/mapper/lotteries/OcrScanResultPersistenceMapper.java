package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface OcrScanResultPersistenceMapper {

    @Mapping(target = "scannedBy", source = "scannedBy", qualifiedByName = "userIdToEntity")
    OcrScanResultEntity toEntity(OcrScanResultModel model);

    @Mapping(target = "scannedBy", source = "scannedBy.id")
    OcrScanResultModel toDomain(OcrScanResultEntity entity);

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
