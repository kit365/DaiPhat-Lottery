package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
import lombok.Builder;

import java.util.List;

@Builder
public record ImportBatchReductionLineResponse(
        Long lineId,
        Long lotteryStationId,
        String stationName,
        ImportBatchLineStatus status,
        boolean deletable,
        Integer importedQuantity,
        List<ImportBatchReductionTicketResponse> tickets
) {
}
