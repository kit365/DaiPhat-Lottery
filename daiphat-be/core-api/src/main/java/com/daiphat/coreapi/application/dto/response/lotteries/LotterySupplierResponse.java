package com.daiphat.coreapi.application.dto.response.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotterySupplierType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Builder
public record LotterySupplierResponse(
        Long id,
        String name,
        String code,
        LotterySupplierType type,
        String typeLabel,
        String contactName,
        String contactPhone,
        String contactEmail,
        String address,
        String taxCode,
        Integer paymentTermDays,
        BigDecimal defaultImportCost,
        boolean isActive,
        List<String> missingActivationFields,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
