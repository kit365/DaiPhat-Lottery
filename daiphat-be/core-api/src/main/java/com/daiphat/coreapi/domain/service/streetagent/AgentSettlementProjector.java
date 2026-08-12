package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AgentSettlementStatus;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorLateReturnPolicy;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationBatchModel;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class AgentSettlementProjector {

    public record Projection(
            LocalDate settlementDate,
            BigDecimal returnedValue,
            BigDecimal soldValue,
            BigDecimal commissionAmount,
            BigDecimal depositAmount,
            BigDecimal agentReceives,
            BigDecimal agentPays,
            AgentSettlementStatus status,
            LocalDateTime paidAt,
            UUID collectedBy,
            LocalDateTime collectedAt
    ) {}

    public static Projection project(VendorAllocationBatchModel batch, LocalDateTime settledAt, UUID operatorId) {
        BigDecimal face = batch.getFaceValueSnapshot() == null ? BigDecimal.ZERO : batch.getFaceValueSnapshot();
        BigDecimal returnedValue = face.multiply(BigDecimal.valueOf(batch.getReturnedQuantity()));
        BigDecimal soldValue = face.multiply(BigDecimal.valueOf(batch.getSoldQuantity()));
        BigDecimal commission = nz(batch.getCommissionPayable());
        BigDecimal deposit = nz(batch.getDepositReceivedAmount());
        BigDecimal agentReceives = commission.add(nz(batch.getDepositRefundAmount()));
        BigDecimal agentPays = batch.getLatePolicySnapshot() == VendorLateReturnPolicy.FORCE_PURCHASE_ALL
                ? nz(batch.getAdditionalAmountDue())
                : nz(batch.getGrossCashRemitted());
        return new Projection(
                settledAt.toLocalDate(),
                returnedValue,
                soldValue,
                commission,
                deposit,
                agentReceives,
                agentPays,
                AgentSettlementStatus.COMPLETED,
                settledAt,
                operatorId,
                settledAt
        );
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
