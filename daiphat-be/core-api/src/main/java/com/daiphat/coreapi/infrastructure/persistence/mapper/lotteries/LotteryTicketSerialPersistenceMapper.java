package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketSerialEntity;
import com.daiphat.coreapi.infrastructure.persistence.entity.user.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface LotteryTicketSerialPersistenceMapper {

    @Mapping(target = "ticket", source = "ticketId", qualifiedByName = "ticketIdToEntity")
    @Mapping(target = "importBatch", source = "importBatchId", qualifiedByName = "importBatchIdToEntity")
    @Mapping(target = "importBatchLine", source = "importBatchLineId", qualifiedByName = "importBatchLineIdToEntity")
    @Mapping(target = "importedBy", source = "importedById", qualifiedByName = "userIdToEntity")
    @Mapping(target = "verifiedBy", source = "verifiedById", qualifiedByName = "userIdToEntity")
    LotteryTicketSerialEntity toEntity(LotteryTicketSerialModel model);

    @Mapping(target = "ticketId", source = "ticket.id")
    @Mapping(target = "importBatchId", source = "importBatch.id")
    @Mapping(target = "importBatchLineId", source = "importBatchLine.id")
    @Mapping(target = "importedById", source = "importedBy.id")
    @Mapping(target = "verifiedById", source = "verifiedBy.id")
    LotteryTicketSerialModel toDomain(LotteryTicketSerialEntity entity);

    @Named("ticketIdToEntity")
    default LotteryTicketEntity ticketIdToEntity(Long ticketId) {
        if (ticketId == null) {
            return null;
        }
        LotteryTicketEntity entity = new LotteryTicketEntity();
        entity.setId(ticketId);
        return entity;
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
