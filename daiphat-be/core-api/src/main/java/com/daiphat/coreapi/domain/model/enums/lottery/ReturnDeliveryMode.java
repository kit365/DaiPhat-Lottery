package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReturnDeliveryMode {
    /** Staff delivers tickets to the supplier: IN_STOCK → PENDING_RETURN, then later → RETURNED. */
    RETAILER_DELIVERS("Đại lý mang trả NCC"),
    /** Supplier staff collects on-site: IN_STOCK → RETURNED directly. */
    SUPPLIER_COLLECTS("NCC đến lấy vé");

    private final String label;
}
