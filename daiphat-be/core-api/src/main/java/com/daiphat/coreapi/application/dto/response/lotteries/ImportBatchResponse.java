package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
public record ImportBatchResponse(
        Long id,
        Long lotteryStationId,
        Long supplierLedgerId,
        ImportBatchType requestedBatchType,
        ImportBatchType batchType,
        String invoiceEvidenceUrl,
        LocalDate drawDate,
        Integer declareQuantity,
        Integer totalQuantity,
        BigDecimal importCost,
        BigDecimal totalCostValue,
        UUID importedBy,
        LocalDateTime importedAt,
        ImportBatchStatus status,
        boolean lateImportWarning,
        List<String> warnings,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
