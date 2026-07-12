package com.daiphat.coreapi.domain.model.enums.lottery;

public enum LotteryStationActivationField {
    NAME("Tên nhà đài"),
    PRICE("Giá vé"),
    COMMISSION_RATE("Tỷ lệ hoa hồng"),
    REGION("Vùng miền"),
    PROVINCE("Tỉnh/Thành phố"),
    DRAW_SCHEDULE("Lịch quay"),
    DRAW_TIME("Giờ quay");

    private final String displayLabel;

    LotteryStationActivationField(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public String displayLabel() {
        return displayLabel;
    }
}
