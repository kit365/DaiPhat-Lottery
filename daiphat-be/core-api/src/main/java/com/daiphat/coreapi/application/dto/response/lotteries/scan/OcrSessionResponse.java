package com.daiphat.coreapi.application.dto.response.lotteries.scan;

import com.daiphat.coreapi.domain.model.enums.lottery.OcrSessionStatus;
import java.time.Instant;

public record OcrSessionResponse(
        String sessionCode,
        OcrSessionStatus status,
        Long importBatchId,
        Long importBatchLineId,
        String connectedStaffName,
        String connectedDevice,
        int scannedTicketCount,
        Instant createdAt,
        Instant expiresAt,
        String qrToken
) {
}
