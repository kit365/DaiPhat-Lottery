package com.daiphat.coreapi.application.dto.response.refund;

import java.time.LocalDateTime;

public record RefundProcessingHistoryItem(
        String action,
        String detail,
        LocalDateTime occurredAt
) {
}
