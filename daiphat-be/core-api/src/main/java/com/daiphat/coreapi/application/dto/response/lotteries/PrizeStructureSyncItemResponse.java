package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record PrizeStructureSyncItemResponse(
        Long prizeStructureId,
        String prizeLevel,
        String prizeDisplayName,
        String prizeCode,
        String description,
        BigDecimal prizeValue,
        Integer quantity,
        Integer matchDigits,
        String matchFrom,
        String matchFromDisplayName,
        Integer displayOrder,
        boolean isActive,
        SyncAction action,
        String note
) {
}
