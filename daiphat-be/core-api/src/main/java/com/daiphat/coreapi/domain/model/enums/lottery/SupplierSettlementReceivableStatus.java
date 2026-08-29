package com.daiphat.coreapi.domain.model.enums.lottery;

/** Trạng thái bản ghi công nợ nhà đài (supplier_settlement_receivables). */
public enum SupplierSettlementReceivableStatus {
    /** Còn nợ */
    PENDING,
    /** Đã thanh toán một phần */
    PARTIALLY_SETTLED,
    /** Đã thanh toán đủ */
    SETTLED
}
