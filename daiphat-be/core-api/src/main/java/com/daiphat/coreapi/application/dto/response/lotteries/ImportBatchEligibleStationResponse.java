package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record ImportBatchEligibleStationResponse(
        Long lotteryStationId,
        String name,
        /** Business code; the exact-match column of an import file. */
        String code,
        /** "Thứ 2, Thứ 6 · 16:15" — printed on the delivery note beside the station. */
        String drawSchedule,
        ImportBatchType resolvedBatchType,
        BigDecimal price,
        BigDecimal commissionRate
) {
}
