package com.daiphat.coreapi.application.port.in.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryTicketEntryDraftRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketEntryDraftResponse;

import java.util.List;
import java.util.UUID;

public interface LotteryTicketEntryDraftServicePort {

    List<LotteryTicketEntryDraftResponse> getByImportBatchId(Long importBatchId, UUID operatorId);

    LotteryTicketEntryDraftResponse upsert(SaveLotteryTicketEntryDraftRequest request, UUID operatorId);

    void deleteByImportBatchLineId(Long importBatchLineId, UUID operatorId);
}
