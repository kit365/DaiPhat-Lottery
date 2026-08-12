package com.daiphat.coreapi.application.port.out.streetagent;

import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Vendor-facing view of the shared {@code transactions} ledger.
 *
 * <p>This port deliberately does not own a street-agent-only table. It keeps
 * the allocation use case independent from the order transaction adapter while
 * recording every deposit event in the one common financial ledger.</p>
 */
public interface VendorDepositTransactionRepositoryPort {
    void record(DepositTransaction transaction);

    record DepositTransaction(
            Long profileId, Long allocationBatchId, TransactionBusinessType transactionType, LocalDate businessDate,
            BigDecimal amount, LocalDateTime paidAt, UUID actorId, String reason) {}
}
