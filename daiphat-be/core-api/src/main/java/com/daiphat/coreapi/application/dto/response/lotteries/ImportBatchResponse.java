package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
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
        UUID importedBy,
        LocalDateTime importedAt,
        ImportBatchStatus status,
        Integer totalDeclareQuantity,
        BigDecimal totalDeclaredCostValue,
        boolean lateImportWarning,
        List<String> warnings,
        List<ImportBatchLineResponse> lines,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
