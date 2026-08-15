package com.daiphat.coreapi.application.dto.response.lotteries;

import lombok.Builder;

import java.math.BigDecimal;

/**
 * One station whose prices in the uploaded file disagree with the station record.
 *
 * <p>Import is blocked while any of these stand, because the batch line would be
 * costed from the station record while the operator believes the file's numbers
 * apply. Each field pairs what the file said with what the system holds so the
 * correction dialog can show both sides without a second round trip.
 *
 * @param importCostExpected derived as {@code salePrice * (1 - commissionRate)},
 *                           the same figure {@code ImportCostCalculator} writes
 *                           onto the import batch line
 */
@Builder
public record ImportBatchFilePricingMismatchResponse(
        Long lotteryStationId,
        String stationName,

        BigDecimal salePriceInFile,
        BigDecimal salePriceInSystem,
        boolean salePriceMismatch,

        /** Percentage, e.g. {@code 10} for 10%, matching how the file states it. */
        BigDecimal commissionRateInFile,
        BigDecimal commissionRateInSystem,
        boolean commissionRateMismatch,

        BigDecimal importCostInFile,
        BigDecimal importCostExpected,
        boolean importCostMismatch
) {

    public boolean hasMismatch() {
        return salePriceMismatch || commissionRateMismatch || importCostMismatch;
    }
}
