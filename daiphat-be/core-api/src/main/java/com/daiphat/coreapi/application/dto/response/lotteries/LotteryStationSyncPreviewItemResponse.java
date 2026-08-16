package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SyncAction;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Builder
public record LotteryStationSyncPreviewItemResponse(
        String name,
        String canonicalName,
        /** Existing code when the station is already known, otherwise a suggestion. */
        String code,
        String province,
        String region,
        List<DayOfWeek> drawDays,
        @JsonFormat(pattern = "HH:mm")
        LocalTime drawTime,
        LocalDate nextDrawDate,
        BigDecimal price,
        BigDecimal commissionRate,
        SyncAction action,
        Long existingStationId,
        String previewStatus
) {
}
