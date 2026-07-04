package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LotterySupplierType {
    LOTTERY_COMPANY("Nhà đài (nhập thẳng từ công ty XS)"),
    DISTRIBUTOR("Tổng đại lý / Đại lý phân phối");

    private final String label;
}
