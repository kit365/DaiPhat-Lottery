package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;

import java.util.Locale;
import java.util.Optional;

public enum LotteryRegionCode {
    MIEN_NAM,
    MIEN_TRUNG,
    MIEN_BAC;

    public static final String DEFAULT_VALUE = "MIEN_NAM";

    public String code() {
        return name();
    }

    public String shortDisplayName() {
        return switch (this) {
            case MIEN_NAM -> "Nam";
            case MIEN_TRUNG -> "Trung";
            case MIEN_BAC -> "Bắc";
        };
    }

    public static Optional<LotteryRegionCode> fromCode(String regionCode) {
        if (regionCode == null || regionCode.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(valueOf(regionCode.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }

    public static String normalize(String region) {
        return region == null ? DEFAULT_VALUE : LotteryRegionModel.normalizeCode(region);
    }
}
