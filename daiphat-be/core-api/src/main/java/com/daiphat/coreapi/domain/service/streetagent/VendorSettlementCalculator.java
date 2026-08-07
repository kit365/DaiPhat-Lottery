package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.VendorLateReturnPolicy;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorSettlementCalculator {

    public record Result(
            int soldQuantity,
            int returnedQuantity,
            BigDecimal grossCashRemitted,
            BigDecimal commissionPayable,
            BigDecimal depositRefundAmount,
            BigDecimal depositForfeitedAmount,
            BigDecimal forcedPurchaseAmount,
            BigDecimal additionalAmountDue,
            BigDecimal agencyNetSalesAmount
    ) {}

    public static Result calculate(
            int allocatedQuantity,
            int returnedQuantity,
            BigDecimal faceValue,
            BigDecimal vendorUnitPrice,
            BigDecimal depositHeld,
            boolean late,
            VendorLateReturnPolicy latePolicy
    ) {
        validate(allocatedQuantity, returnedQuantity, faceValue, vendorUnitPrice, depositHeld, latePolicy);
        int soldQuantity = allocatedQuantity - returnedQuantity;

        if (late && latePolicy == VendorLateReturnPolicy.FORCE_PURCHASE_ALL) {
            BigDecimal forcedPurchase = money(vendorUnitPrice.multiply(BigDecimal.valueOf(allocatedQuantity)));
            BigDecimal due = money(forcedPurchase.subtract(depositHeld).max(BigDecimal.ZERO));
            return new Result(soldQuantity, returnedQuantity, forcedPurchase, BigDecimal.ZERO,
                    BigDecimal.ZERO, money(depositHeld), forcedPurchase, due, forcedPurchase);
        }

        BigDecimal gross = money(faceValue.multiply(BigDecimal.valueOf(soldQuantity)));
        BigDecimal commissionPerTicket = faceValue.subtract(vendorUnitPrice);
        BigDecimal commission = money(commissionPerTicket.multiply(BigDecimal.valueOf(soldQuantity)));
        BigDecimal refund = late ? BigDecimal.ZERO : money(depositHeld);
        BigDecimal forfeited = late ? money(depositHeld) : BigDecimal.ZERO;
        return new Result(soldQuantity, returnedQuantity, gross, commission, refund, forfeited,
                BigDecimal.ZERO, BigDecimal.ZERO, money(gross.subtract(commission)));
    }

    private static void validate(
            int allocatedQuantity,
            int returnedQuantity,
            BigDecimal faceValue,
            BigDecimal vendorUnitPrice,
            BigDecimal depositHeld,
            VendorLateReturnPolicy latePolicy
    ) {
        if (allocatedQuantity < 0 || returnedQuantity < 0 || returnedQuantity > allocatedQuantity
                || faceValue == null || faceValue.signum() < 0
                || vendorUnitPrice == null || vendorUnitPrice.signum() < 0
                || vendorUnitPrice.compareTo(faceValue) > 0
                || depositHeld == null || depositHeld.signum() < 0
                || latePolicy == null) {
            throw new IllegalArgumentException("Invalid vendor settlement inputs");
        }
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP);
    }
}
