package com.daiphat.coreapi.application.dto.response.lotteries.scanlog;

import com.daiphat.coreapi.domain.model.enums.lottery.ScanEventType;
import com.daiphat.coreapi.domain.model.enums.lottery.ScanMethod;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record LotteryScanLogResponse(
        Long id,
        ScanEventType eventType,
        Long ocrScanResultId,
        Long lotteryTicketSerialId,
        UUID scannedBy,
        ScanMethod scanMethod,
        Boolean isValid,
        String note,
        LocalDateTime scannedAt
) {
}
