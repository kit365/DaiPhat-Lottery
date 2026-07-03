package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.UUID;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ImportBatchPersistenceMapper {

    @Mapping(target = "lotteryStationId", source = "lotteryStation.id")
    @Mapping(target = "importedBy", source = "importedBy.id")
    ImportBatchModel toDomain(ImportBatchEntity entity);

    @Mapping(target = "lotteryStation", source = "lotteryStationId")
    @Mapping(target = "importedBy", source = "importedBy")
    ImportBatchEntity toEntity(ImportBatchModel model);

    default LotteryStationEntity mapLotteryStationId(Long lotteryStationId) {
        if (lotteryStationId == null) {
            return null;
        }
        LotteryStationEntity station = new LotteryStationEntity();
        station.setId(lotteryStationId);
        return station;
    }

    default UserEntity mapImportedBy(UUID importedBy) {
        if (importedBy == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(importedBy);
        return user;
    }
}
