package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionModel {

    private Long id;
    /** Null for refund payouts — those are linked only via {@link #refundRequestId}. */
    private UUID orderId;
    /** Set for REFUND payout transactions (1 RefundRequest → N Transactions). */
    private Long refundRequestId;
    private BigDecimal amount;
    private PaymentGateway gateway;
    private Long gatewayOrderCode;
    private String paymentRef;

    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    private LocalDateTime paidAt;
    private LocalDateTime cancelledAt;
    private String failureReason;
    private LocalDateTime codCollectedAt;
    private UUID codCollectedBy;
    private String paymentEvidenceUrl;
    private UUID paymentBy;
    private String note;
    private TransactionType type;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = TransactionStatus.PENDING;
        }
    }

    public void markPayOsSuccess(String paymentRef) {
        ensureType(TransactionType.ONLINE);
        ensureStatus(TransactionStatus.PENDING);
        this.paymentRef = paymentRef;
        this.status = TransactionStatus.COMPLETED;
        this.paidAt = LocalDateTime.now();
        this.cancelledAt = null;
        this.failureReason = null;
    }

    public void markPayOsFailed(String failureReason) {
        ensureType(TransactionType.ONLINE);
        ensureStatus(TransactionStatus.PENDING);
        this.status = TransactionStatus.FAILED;
        this.failureReason = failureReason;
        this.cancelledAt = LocalDateTime.now();
    }

    public void releaseGatewayAttempt(String failureReason) {
        ensureType(TransactionType.ONLINE);
        ensureStatus(TransactionStatus.PENDING);
        this.gatewayOrderCode = null;
        this.paymentRef = null;
        this.failureReason = failureReason;
        this.cancelledAt = LocalDateTime.now();
    }

    public void collectCash(UUID collectorId) {
        ensureType(TransactionType.OFFLINE);
        markDirectPaymentCompleted(collectorId);
    }

    public void markDirectPaymentCompleted(UUID operatorId) {
        ensureManualDirectType();
        ensureStatus(TransactionStatus.PENDING);
        this.status = TransactionStatus.COMPLETED;
        this.paidAt = LocalDateTime.now();
        this.cancelledAt = null;
        this.failureReason = null;
        if (this.type == TransactionType.OFFLINE) {
            this.codCollectedBy = operatorId;
            this.codCollectedAt = this.paidAt;
            return;
        }
        this.codCollectedBy = null;
        this.codCollectedAt = null;
    }

    public void markCancelled(String note) {
        ensureStatus(TransactionStatus.PENDING);
        this.status = TransactionStatus.CANCELLED;
        this.note = note;
        this.cancelledAt = LocalDateTime.now();
    }

    public void markRefunded() {
        ensureStatus(TransactionStatus.COMPLETED);
        this.status = TransactionStatus.REFUNDED;
    }

    /**
     * Records a staff refund payout linked to a RefundRequest (bank transfer evidence).
     * Refund payouts reference only {@code refundRequestId} — not an order.
     */
    public void markRefundPayoutCompleted(UUID operatorId, String evidenceUrl, String note) {
        if (this.type != TransactionType.REFUND) {
            throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
        }
        if (this.refundRequestId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Refund payout must reference a refund request.");
        }
        if (evidenceUrl == null || evidenceUrl.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.orderId = null;
        this.status = TransactionStatus.COMPLETED;
        this.paidAt = LocalDateTime.now();
        this.cancelledAt = null;
        this.failureReason = null;
        this.paymentBy = operatorId;
        this.paymentEvidenceUrl = evidenceUrl.trim();
        if (note != null && !note.isBlank()) {
            this.note = note.trim();
        }
    }

    private void ensureType(TransactionType expectedType) {
        if (this.type != expectedType) {
            throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
        }
    }

    private void ensureManualDirectType() {
        if (this.type != TransactionType.OFFLINE && this.type != TransactionType.ONLINE) {
            throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
        }
    }

    private void ensureStatus(TransactionStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
        }
    }

    private void ensureStatusIn(TransactionStatus... allowedStatuses) {
        for (TransactionStatus allowedStatus : allowedStatuses) {
            if (this.status == allowedStatus) {
                return;
            }
        }
        throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
    }
}
