package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFilePricingMismatchResponse;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Compares the prices a supplier stated in an upload against the station record.
 *
 * <p>The import batch line is always costed with
 * {@link ImportCostCalculator#fromStation}, so a file that disagrees would have
 * the operator approving one price while the ledger records another. Rather than
 * quietly trusting either side, the preview surfaces the gap and blocks until a
 * human picks the right number.
 *
 * <p>Commission is percentage in the file ({@code 10}) but a fraction on the
 * station ({@code 0.10}); conversion happens here so callers never juggle units.
 */
@Component
public class ImportBatchFilePricingComparator {

    /** Money is compared at whole đồng: sub-đồng noise is not a real discrepancy. */
    private static final int MONEY_SCALE = 0;

    /** Commission percentages are compared to two decimals, e.g. 10.25%. */
    private static final int PERCENT_SCALE = 2;

    public ImportBatchFilePricingMismatchResponse compare(
            LotteryStationModel station,
            BigDecimal salePriceInFile,
            BigDecimal commissionPercentInFile,
            BigDecimal importCostInFile
    ) {
        BigDecimal systemSalePrice = station.getPrice();
        BigDecimal systemCommissionPercent = toPercent(station.getCommissionRate());
        BigDecimal expectedImportCost = safeExpectedImportCost(station);

        return ImportBatchFilePricingMismatchResponse.builder()
                .lotteryStationId(station.getId())
                .stationName(station.getName())
                .salePriceInFile(salePriceInFile)
                .salePriceInSystem(systemSalePrice)
                .salePriceMismatch(differsAsMoney(salePriceInFile, systemSalePrice))
                .commissionRateInFile(commissionPercentInFile)
                .commissionRateInSystem(systemCommissionPercent)
                .commissionRateMismatch(differs(commissionPercentInFile, systemCommissionPercent, PERCENT_SCALE))
                .importCostInFile(importCostInFile)
                .importCostExpected(expectedImportCost)
                .importCostMismatch(differsAsMoney(importCostInFile, expectedImportCost))
                .build();
    }

    /**
     * A station missing price or commission cannot produce an expected cost;
     * returning null keeps the comparison silent instead of throwing mid-preview.
     */
    private BigDecimal safeExpectedImportCost(LotteryStationModel station) {
        if (station.getPrice() == null || station.getCommissionRate() == null) {
            return null;
        }
        try {
            return ImportCostCalculator.fromStation(station);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public BigDecimal toPercent(BigDecimal fraction) {
        return fraction == null
                ? null
                : fraction.multiply(BigDecimal.valueOf(100)).setScale(PERCENT_SCALE, RoundingMode.HALF_UP);
    }

    /** Inverse of {@link #toPercent}, for writing an operator's correction back. */
    public BigDecimal toFraction(BigDecimal percent) {
        return percent == null
                ? null
                : percent.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP);
    }

    private boolean differsAsMoney(BigDecimal fromFile, BigDecimal fromSystem) {
        return differs(fromFile, fromSystem, MONEY_SCALE);
    }

    /**
     * A column the file never supplied is not a disagreement — only a value that
     * is present and different counts.
     */
    private boolean differs(BigDecimal fromFile, BigDecimal fromSystem, int scale) {
        if (fromFile == null || fromSystem == null) {
            return false;
        }
        return fromFile.setScale(scale, RoundingMode.HALF_UP)
                .compareTo(fromSystem.setScale(scale, RoundingMode.HALF_UP)) != 0;
    }
}
