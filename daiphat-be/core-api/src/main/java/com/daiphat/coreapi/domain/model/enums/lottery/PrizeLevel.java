package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum PrizeLevel {
    SPECIAL("Giải Đặc Biệt"),
    FIRST("Giải Nhất"),
    SECOND("Giải Nhì"),
    THIRD("Giải Ba"),
    FOURTH("Giải Tư"),
    FIFTH("Giải Năm"),
    SIXTH("Giải Sáu"),
    SEVENTH("Giải Bảy"),
    EIGHTH("Giải Tám"),
    SUB_SPECIAL("Giải phụ đặc biệt"),
    CONSOLATION("Giải khuyến khích");

    private final String displayName;
}
