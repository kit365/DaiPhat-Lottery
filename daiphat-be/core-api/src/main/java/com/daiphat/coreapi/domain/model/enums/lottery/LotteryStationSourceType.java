package com.daiphat.coreapi.domain.model.enums.lottery;

public enum LotteryStationSourceType {
    MINH_NGOC,
    XOSO_VN;

    public static final String DEFAULT_VALUE = "MINH_NGOC";
    public static final LotteryStationSourceType DEFAULT = MINH_NGOC;

    public String value() {
        return name();
    }
}
