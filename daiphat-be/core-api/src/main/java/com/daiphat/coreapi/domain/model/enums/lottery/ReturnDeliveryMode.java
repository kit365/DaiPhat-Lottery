package com.daiphat.coreapi.domain.model.enums.lottery;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ReturnDeliveryMode {
    /** Staff delivers tickets to the supplier; serial stays linked via returnBatchLineId until handover. */
    RETAILER_DELIVERS("Đại lý mang trả NCC"),
    /** Supplier staff collects on-site; serial stays linked via returnBatchLineId until handover. */
    SUPPLIER_COLLECTS("NCC đến lấy vé");

    private final String label;
}
