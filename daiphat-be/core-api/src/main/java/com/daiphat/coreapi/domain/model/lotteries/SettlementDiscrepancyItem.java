package com.daiphat.coreapi.domain.model.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyDirection;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementDiscrepancyType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * One detected System vs Actual discrepancy.
 * {@code difference} is always {@code actual − system} (signed).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettlementDiscrepancyItem {

    private SupplierSettlementDiscrepancyType type;
    private SupplierSettlementDiscrepancyDirection direction;
    /** Signed actual − system. Tickets for quantity types; VNĐ/ticket for unit price. */
    private BigDecimal difference;
    /** {@code TICKET} or {@code VND}. */
    private String unit;

    @JsonIgnore
    public boolean isPositive() {
        return direction == SupplierSettlementDiscrepancyDirection.POSITIVE;
    }

    @JsonIgnore
    public boolean isNegative() {
        return direction == SupplierSettlementDiscrepancyDirection.NEGATIVE;
    }

    public static SettlementDiscrepancyItem ofQuantity(
            SupplierSettlementDiscrepancyType type,
            int signedDifference
    ) {
        if (signedDifference == 0) {
            return null;
        }
        return SettlementDiscrepancyItem.builder()
                .type(type)
                .direction(SupplierSettlementDiscrepancyDirection.fromSignedDifference(signedDifference))
                .difference(BigDecimal.valueOf(signedDifference))
                .unit("TICKET")
                .build();
    }

    public static SettlementDiscrepancyItem ofUnitPrice(BigDecimal signedDifference) {
        if (signedDifference == null || signedDifference.signum() == 0) {
            return null;
        }
        return SettlementDiscrepancyItem.builder()
                .type(SupplierSettlementDiscrepancyType.IMPORT_UNIT_PRICE)
                .direction(SupplierSettlementDiscrepancyDirection.fromSignedDifference(signedDifference))
                .difference(signedDifference)
                .unit("VND")
                .build();
    }

    public static java.util.List<SettlementDiscrepancyItem> fromMatching(
            Integer systemImportQty,
            Integer actualImportQty,
            Integer systemReturnQty,
            Integer actualReturnQty,
            BigDecimal originalUnitPrice,
            BigDecimal reconciledUnitPrice
    ) {
        java.util.List<SettlementDiscrepancyItem> items = new java.util.ArrayList<>();
        if (actualImportQty != null && systemImportQty != null) {
            SettlementDiscrepancyItem importItem = ofQuantity(
                    SupplierSettlementDiscrepancyType.IMPORT_QUANTITY,
                    actualImportQty - systemImportQty
            );
            if (importItem != null) {
                items.add(importItem);
            }
        }
        if (actualReturnQty != null && systemReturnQty != null) {
            SettlementDiscrepancyItem returnItem = ofQuantity(
                    SupplierSettlementDiscrepancyType.RETURN_QUANTITY,
                    actualReturnQty - systemReturnQty
            );
            if (returnItem != null) {
                items.add(returnItem);
            }
        }
        if (originalUnitPrice != null && reconciledUnitPrice != null) {
            SettlementDiscrepancyItem priceItem = ofUnitPrice(reconciledUnitPrice.subtract(originalUnitPrice));
            if (priceItem != null) {
                items.add(priceItem);
            }
        }
        return items;
    }
}
