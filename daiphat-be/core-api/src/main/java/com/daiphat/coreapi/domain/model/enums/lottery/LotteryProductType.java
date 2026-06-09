package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotteryProductType {
    TRADITIONAL("TRADITIONAL_LOTTERY");
    private final String displayName;
}
