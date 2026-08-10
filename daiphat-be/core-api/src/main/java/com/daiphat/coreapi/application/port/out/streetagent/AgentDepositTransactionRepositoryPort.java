package com.daiphat.coreapi.application.port.out.streetagent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public interface AgentDepositTransactionRepositoryPort {
    void record(DepositTransaction transaction);

    record DepositTransaction(
            Long profileId, Long allocationBatchId, String type, LocalDate debtDate,
            BigDecimal requiredAmount, BigDecimal paidAmount, BigDecimal remainingAmount,
            BigDecimal returnedAmount, BigDecimal balanceBefore, BigDecimal balanceAfter,
            LocalDateTime paidAt, UUID actorId, String reason) {}
}
