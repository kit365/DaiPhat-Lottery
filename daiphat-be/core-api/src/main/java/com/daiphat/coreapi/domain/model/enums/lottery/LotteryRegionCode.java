package com.daiphat.coreapi.domain.model.enums.lottery;

import com.daiphat.coreapi.domain.model.lotteries.LotteryRegionModel;

public enum LotteryRegionCode {
    MIEN_NAM,
    MIEN_TRUNG,
    MIEN_BAC;

    public static final String DEFAULT_VALUE = "MIEN_NAM";

    public String code() {
        return name();
    }

    public static String normalize(String region) {
        return region == null ? DEFAULT_VALUE : LotteryRegionModel.normalizeCode(region);
    }
}
