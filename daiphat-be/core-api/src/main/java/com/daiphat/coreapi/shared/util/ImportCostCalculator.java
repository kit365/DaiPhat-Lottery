package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryStationModel;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Unit import cost (costPrice) from station sale price and commission rate.
 * Result is always scale 3, HALF_UP.
 */
public final class ImportCostCalculator {

    public static final int COST_SCALE = 3;
    public static final RoundingMode COST_ROUNDING = RoundingMode.HALF_UP;

    private ImportCostCalculator() {
    }

    public static BigDecimal fromStation(LotteryStationModel station) {
        if (station == null) {
            throw new DomainException(ErrorCode.LOTTERY_STATION_NOT_FOUND);
        }
        return fromPriceAndCommission(station.getPrice(), station.getCommissionRate());
    }

    public static BigDecimal fromPriceAndCommission(BigDecimal salePrice, BigDecimal commissionRate) {
        if (salePrice == null || salePrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_IMPORT_COST_INVALID);
        }
        if (commissionRate == null
                || commissionRate.compareTo(BigDecimal.ZERO) < 0
                || commissionRate.compareTo(BigDecimal.ONE) > 0) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_IMPORT_COST_INVALID);
        }
        return salePrice
                .multiply(BigDecimal.ONE.subtract(commissionRate))
                .setScale(COST_SCALE, COST_ROUNDING);
    }

    public static BigDecimal scaleMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(COST_SCALE, COST_ROUNDING);
        }
        return value.setScale(COST_SCALE, COST_ROUNDING);
    }
}
