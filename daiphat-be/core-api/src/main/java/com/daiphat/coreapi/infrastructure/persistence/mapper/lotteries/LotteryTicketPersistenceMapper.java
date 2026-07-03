package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryStationEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.List;
import java.util.UUID;

@Mapper(componentModel = "spring")
public interface LotteryTicketPersistenceMapper {

    @Mapping(target = "station", source = "stationId", qualifiedByName = "stationIdToStationEntity")
    @Mapping(target = "importBatch", source = "importBatchId", qualifiedByName = "importBatchIdToEntity")
    @Mapping(target = "importBatchLine", source = "importBatchLineId", qualifiedByName = "importBatchLineIdToEntity")
    @Mapping(target = "serials", ignore = true)
    @Mapping(target = "importedBy", ignore = true)
    @Mapping(target = "verifiedBy", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "verifiedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    LotteryTicketEntity toEntity(LotteryTicketModel model);

    List<LotteryTicketEntity> toEntityList(List<LotteryTicketModel> models);

    @Mapping(target = "stationId", source = "station.id")
    @Mapping(target = "importBatchId", source = "importBatch.id")
    @Mapping(target = "importBatchLineId", source = "importBatchLine.id")
    @Mapping(target = "serials", ignore = true)
    @Mapping(target = "importedById", ignore = true)
    @Mapping(target = "verifiedById", ignore = true)
    @Mapping(target = "importedAt", ignore = true)
    @Mapping(target = "verified", ignore = true)
    @Mapping(target = "verifiedAt", ignore = true)
    @Mapping(target = "returnedAt", ignore = true)
    LotteryTicketModel toDomain(LotteryTicketEntity entity);

    List<LotteryTicketModel> toDomainList(List<LotteryTicketEntity> entities);

    @Named("stationIdToStationEntity")
    default LotteryStationEntity stationIdToStationEntity(Long stationId) {
        if (stationId == null) {
            return null;
        }
        LotteryStationEntity station = new LotteryStationEntity();
        station.setId(stationId);
        return station;
    }

    @Named("importBatchLineIdToEntity")
    default ImportBatchLineEntity importBatchLineIdToEntity(Long importBatchLineId) {
        if (importBatchLineId == null) {
            return null;
        }
        ImportBatchLineEntity line = new ImportBatchLineEntity();
        line.setId(importBatchLineId);
        return line;
    }

    @Named("importBatchIdToEntity")
    default ImportBatchEntity importBatchIdToEntity(Long importBatchId) {
        if (importBatchId == null) {
            return null;
        }
        ImportBatchEntity importBatch = new ImportBatchEntity();
        importBatch.setId(importBatchId);
        return importBatch;
    }

    @Named("userIdToUserEntity")
    default UserEntity userIdToUserEntity(UUID userId) {
        if (userId == null) {
            return null;
        }
        UserEntity user = new UserEntity();
        user.setId(userId);
        return user;
    }
}
