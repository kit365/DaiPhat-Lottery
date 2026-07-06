package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus;
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
        LocalDate drawDate,
        Long supplierId,
        String supplierName,
        Long supplierSettlementId,
        ImportBatchImportMode importMode,
        String invoiceEvidenceUrl,
        UUID importedBy,
        LocalDateTime importedAt,
        ImportBatchStatus status,
        Integer lineCount,
        Integer totalDeclareQuantity,
        BigDecimal totalDeclaredCostValue,
        Integer totalImportedQuantity,
        BigDecimal totalImportedCostValue,
        LocalDateTime submittedAt,
        LocalDateTime completedAt,
        LocalDateTime ledgerAt,
        String note,
        String cancelReason,
        boolean lateImportWarning,
        List<String> warnings,
        List<ImportBatchLineResponse> lines,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
