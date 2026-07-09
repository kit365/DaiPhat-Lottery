package com.daiphat.coreapi.domain.model.enums.lottery;

public enum LotterySupplierActivationField {
    CONTACT_PHONE("Số điện thoại"),
    ADDRESS("Địa chỉ"),
    PAYMENT_TERM_DAYS("Số ngày thanh toán"),
    DEFAULT_IMPORT_COST("Giá vốn mặc định");

    private final String displayLabel;

    LotterySupplierActivationField(String displayLabel) {
        this.displayLabel = displayLabel;
    }

    public String displayLabel() {
        return displayLabel;
    }
}
