package com.daiphat.coreapi.domain.model.enums.lottery;

public enum LotteryStationActivationField {
    NAME("Lottery Station Name"),
    PRICE("Ticket Price"),
    COMMISSION_RATE("Commission Rate"),
    REGION("Region"),
    PROVINCE("Province/City"),
    DRAW_SCHEDULE("Draw Schedule"),
    DRAW_TIME("Draw Time");

    private final String displayLabel;

    LotteryStationActivationField(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public String displayLabel() {
        return displayLabel;
    }
}
