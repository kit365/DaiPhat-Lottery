package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
public record SupplierSettlementResponse(
        Long id,
        Long lotterySupplierId,
        String supplierName,
        String supplierCode,
        LocalDate periodFrom,
        LocalDate periodTo,
        String supplierSettlementCode,
        BigDecimal totalImportValue,
        BigDecimal totalReturnValue,
        BigDecimal totalPaidAmount,
        BigDecimal remainingAmount,
        String supplierSettlementReceiptUrl,
        Boolean isReturnExpired,
        BigDecimal expiredReturnValue,
        SupplierSettlementStatus status,
        String statusLabel,
        Long transactionId,
        LocalDateTime paidAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
