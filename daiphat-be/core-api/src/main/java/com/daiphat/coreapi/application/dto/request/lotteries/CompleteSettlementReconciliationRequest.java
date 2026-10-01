package com.daiphat.coreapi.application.dto.request.lotteries;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;

import java.math.BigDecimal;

public record CompleteSettlementReconciliationRequest(
        String reconciliationNote,
        TransactionType paymentMethod,
        BigDecimal paidAmount
) {
    /** Keeps existing callers that only send a reconciliation note compatible. */
    public CompleteSettlementReconciliationRequest(String reconciliationNote) {
        this(reconciliationNote, null, null);
    }
}
