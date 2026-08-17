package com.daiphat.coreapi.application.dto.request.lotteries;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Corrects only a supplier's default import cost.
 *
 * <p>Reached from settlement matching when the actual import price disagrees
 * with the NCC master. Deliberately not {@link UpdateLotterySupplierRequest}:
 * that payload also carries timing rules, type and the active flag, and the
 * matching screen must not overwrite them.
 */
public record UpdateLotterySupplierDefaultImportCostRequest(
        @NotNull
        @DecimalMin(value = "0", inclusive = false, message = "Giá nhập mặc định phải lớn hơn 0")
        BigDecimal defaultImportCost
) {
}
