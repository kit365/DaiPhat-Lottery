package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class OrderRefundGraceService {

    private static final String ALREADY_REQUESTED_REASON = "Đơn hàng đã có yêu cầu hoàn tiền.";

    private static final EnumSet<OrderStatus> REFUNDABLE_STATUSES = EnumSet.of(
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.PENDING_PICKUP);

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final TransactionRepositoryPort transactionRepositoryPort;

    public RefundGraceEvaluation evaluate(OrderModel order) {
        int graceMinutes = getGraceMinutes();

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return ineligible("Đơn hàng đã bị hủy.", graceMinutes, null, null);
        }
        if (order.getStatus() == OrderStatus.COMPLETED) {
            return ineligible("Đơn hàng đã hoàn thành, không thể yêu cầu hoàn tiền.", graceMinutes, null, null);
        }
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            return ineligible("Đơn hàng chưa thanh toán, không thể yêu cầu hoàn tiền.", graceMinutes, null, null);
        }
        if (!REFUNDABLE_STATUSES.contains(order.getStatus())) {
            return ineligible("Trạng thái đơn hàng không cho phép yêu cầu hoàn tiền.", graceMinutes, null, null);
        }

        if (order.getId() != null && refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(order.getId())) {
            return ineligible(ALREADY_REQUESTED_REASON, graceMinutes, null, null);
        }

        LocalDateTime paymentSuccessAt = resolvePaymentSuccessTime(order);
        if (paymentSuccessAt == null) {
            return ineligible("Không xác định được thời gian thanh toán đơn hàng.", graceMinutes, null, null);
        }

        LocalDateTime deadline = paymentSuccessAt.plusMinutes(graceMinutes);
        long remainingSeconds = computeRemainingSeconds(deadline);
        if (remainingSeconds <= 0) {
            return ineligible(
                    "Đã quá " + graceMinutes + " phút kể từ khi thanh toán, không thể yêu cầu hoàn tiền.",
                    graceMinutes,
                    deadline,
                    paymentSuccessAt);
        }

        return new RefundGraceEvaluation(true, null, remainingSeconds, graceMinutes, deadline, paymentSuccessAt);
    }

    public void ensureEligible(OrderModel order) {
        RefundGraceEvaluation evaluation = evaluate(order);
        if (!evaluation.eligible()) {
            if (ALREADY_REQUESTED_REASON.equals(evaluation.reason())) {
                throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
            }
            throw new DomainException(ErrorCode.REFUND_WINDOW_EXPIRED, evaluation.reason());
        }
    }

    public int getGraceMinutes() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parseGraceMinutes)
                .orElseGet(() -> parseGraceMinutes(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getDefaultValue()));
    }

    private RefundGraceEvaluation ineligible(
            String reason,
            int graceMinutes,
            LocalDateTime deadline,
            LocalDateTime paymentSuccessAt) {
        return new RefundGraceEvaluation(false, reason, 0L, graceMinutes, deadline, paymentSuccessAt);
    }

    /**
     * Grace window anchor: latest COMPLETED transaction payment time.
     * Falls back to transaction updated/created timestamps when paid_at is missing.
     */
    private LocalDateTime resolvePaymentSuccessTime(OrderModel order) {
        if (order.getTransactions() != null && !order.getTransactions().isEmpty()) {
            LocalDateTime fromTx = order.getTransactions().stream()
                    .filter(tx -> tx.getStatus() == TransactionStatus.COMPLETED)
                    .map(this::resolveTransactionPaymentTime)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);
            if (fromTx != null) {
                return fromTx;
            }
        }
        if (order.getId() != null) {
            return transactionRepositoryPort.findLatestPaymentSuccessAt(order.getId()).orElse(null);
        }
        return null;
    }

    private LocalDateTime resolveTransactionPaymentTime(TransactionModel transaction) {
        if (transaction.getPaidAt() != null) {
            return transaction.getPaidAt();
        }
        if (transaction.getUpdatedAt() != null) {
            return transaction.getUpdatedAt();
        }
        return transaction.getCreatedAt();
    }

    private long computeRemainingSeconds(LocalDateTime deadline) {
        return Math.max(Duration.between(LocalDateTime.now(), deadline).toSeconds(), 0L);
    }

    private int parseGraceMinutes(String rawValue) {
        try {
            int minutes = Integer.parseInt(rawValue.trim());
            if (minutes <= 0) {
                return Integer.parseInt(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getDefaultValue());
            }
            return minutes;
        } catch (NumberFormatException ex) {
            return Integer.parseInt(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getDefaultValue());
        }
    }

    public record RefundGraceEvaluation(
            boolean eligible,
            String reason,
            Long remainingSeconds,
            int graceMinutes,
            LocalDateTime refundDeadlineAt,
            LocalDateTime paymentSuccessAt
    ) {
    }
}
