package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Builder
public record ReturnBatchResponse(
        Long id,
        String batchCode,
        Long lotterySupplierId,
        String supplierName,
        String supplierCode,
        LocalDate drawDate,
        Long supplierSettlementId,
        String returnReceiptUrl,
        com.daiphat.coreapi.domain.model.enums.lottery.ReturnDeliveryMode deliveryMode,
        String deliveryModeLabel,
        Integer totalQuantity,
        BigDecimal totalReturnValue,
        UUID returnedBy,
        LocalDateTime returnedAt,
        LocalDateTime confirmedAt,
        ReturnBatchStatus status,
        String statusLabel,
        String note,
        String cancelReason,
        LocalDateTime cancelledAt,
        LocalTime returnCutOffTime,
        Integer returnBufferMinutes,
        Integer returnReminderMinutes,
        LocalDateTime inspectionWindowStartAt,
        LocalDateTime reminderTriggerAt,
        LocalDateTime returnCutOffAt,
        Long minutesUntilCutoff,
        boolean inspectionExpired,
        boolean inInspectionWindow,
        boolean urgentReminder,
        List<ReturnBatchLineResponse> lines,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
