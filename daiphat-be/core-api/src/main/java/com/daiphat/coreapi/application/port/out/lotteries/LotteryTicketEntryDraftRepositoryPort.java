package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketEntryDraftModel;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LotteryTicketEntryDraftRepositoryPort {

    LotteryTicketEntryDraftModel save(LotteryTicketEntryDraftModel model);

    List<LotteryTicketEntryDraftModel> findActiveByImportBatchIdAndOperatorId(Long importBatchId, UUID operatorId);

    Optional<LotteryTicketEntryDraftModel> findActiveByImportBatchLineIdAndOperatorId(
            Long importBatchLineId,
            UUID operatorId
    );

    Optional<LotteryTicketEntryDraftModel> findLatestByImportBatchLineIdAndOperatorId(
            Long importBatchLineId,
            UUID operatorId
    );
}
