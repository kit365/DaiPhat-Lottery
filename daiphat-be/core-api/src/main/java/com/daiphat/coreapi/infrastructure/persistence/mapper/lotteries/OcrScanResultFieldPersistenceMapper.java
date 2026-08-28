package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultFieldModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.OcrScanResultFieldEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface OcrScanResultFieldPersistenceMapper {

    @Mapping(target = "correctedBy", source = "correctedBy", qualifiedByName = "userIdToEntity")
    OcrScanResultFieldEntity toEntity(OcrScanResultFieldModel model);

    @Mapping(target = "correctedBy", source = "correctedBy.id")
    OcrScanResultFieldModel toDomain(OcrScanResultFieldEntity entity);

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
