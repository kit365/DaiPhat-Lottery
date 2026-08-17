package com.daiphat.coreapi.domain.model.enums.transaction;

import com.daiphat.coreapi.domain.model.enums.LabeledEnum;
import lombok.Getter;
import lombok.RequiredArgsConstructor;


/**
 * Business purpose of a record in the shared financial ledger.
 *
 * <p>This maps to {@code transactions.transaction_type}. The existing
 * {@code transactions.type} column remains the payment method (offline/online)
 * while the older order flow is migrated separately.</p>
 */
@Getter
@RequiredArgsConstructor
public enum TransactionBusinessType implements LabeledEnum {
    ORDER_PAYMENT("Khách thanh toán mua vé"),
    ORDER_REFUND("Hoàn tiền cho khách"),
    SUPPLIER_PAYMENT("Xuất tiền trả nhà cung cấp"),
    SUPPLIER_REFUND("Nhà cung cấp hoàn tiền"),
    VENDOR_DEPOSIT("Người bán vé số đóng tiền cọc"),
    VENDOR_SETTLEMENT_COLLECTION("Người bán vé số nộp tiền quyết toán"),
    VENDOR_PAYOUT("Hoàn cọc hoặc trả tiền cho người bán vé số"),
    PRIZE_PAYOUT("Xuất quỹ trả thưởng vé trúng"),
    INTERNAL_ADJUSTMENT("Điều chỉnh quỹ nội bộ");

    private final String label;

}
