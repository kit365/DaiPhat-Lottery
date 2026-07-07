package com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketEntryDraftModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntryDraftEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LotteryTicketEntryDraftPersistenceMapper {

    @Mapping(target = "importBatchLineId", source = "importBatchLine.id")
    @Mapping(target = "operatorId", source = "operator.id")
    @Mapping(target = "ticketSections", source = "draftPayload")
    LotteryTicketEntryDraftModel toDomain(LotteryTicketEntryDraftEntity entity);

    @Mapping(target = "importBatchLine", ignore = true)
    @Mapping(target = "operator", ignore = true)
    @Mapping(target = "draftPayload", source = "ticketSections")
    LotteryTicketEntryDraftEntity toEntity(LotteryTicketEntryDraftModel model);
}
