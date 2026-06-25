package com.daiphat.coreapi.application.service.refund;

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

@Service
@RequiredArgsConstructor
public class OrderRefundGraceService {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;

    public RefundGraceEvaluation evaluate(OrderModel order) {
        int graceMinutes = getGraceMinutes();

        if (order.getStatus() == OrderStatus.CANCELLED) {
            return ineligible("Đơn hàng đã bị hủy.", graceMinutes, null);
        }
        if (order.getStatus() == OrderStatus.COMPLETED) {
            return ineligible("Đơn hàng đã hoàn thành, không thể yêu cầu hoàn tiền.", graceMinutes, null);
        }
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            return ineligible("Đơn hàng chưa thanh toán, không thể yêu cầu hoàn tiền.", graceMinutes, null);
        }

        if (order.getId() != null && refundRequestRepositoryPort.existsActiveByOrderId(order.getId())) {
            return ineligible("Đơn hàng đã có yêu cầu hoàn tiền đang xử lý.", graceMinutes, null);
        }

        LocalDateTime paidAt = resolvePaymentSuccessTime(order);
        if (paidAt == null) {
            return ineligible("Không xác định được thời gian thanh toán đơn hàng.", graceMinutes, null);
        }

        LocalDateTime deadline = paidAt.plusMinutes(graceMinutes);
        long remainingSeconds = computeRemainingSeconds(deadline);
        if (remainingSeconds <= 0) {
            return ineligible(
                    "Đã quá " + graceMinutes + " phút kể từ khi thanh toán, không thể yêu cầu hoàn tiền.",
                    graceMinutes,
                    deadline);
        }

        return new RefundGraceEvaluation(true, null, remainingSeconds, graceMinutes, deadline);
    }

    public void ensureEligible(OrderModel order) {
        RefundGraceEvaluation evaluation = evaluate(order);
        if (!evaluation.eligible()) {
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

    private RefundGraceEvaluation ineligible(String reason, int graceMinutes, LocalDateTime deadline) {
        return new RefundGraceEvaluation(false, reason, 0L, graceMinutes, deadline);
    }

    private LocalDateTime resolvePaymentSuccessTime(OrderModel order) {
        if (order.getTransactions() != null) {
            LocalDateTime fromTx = order.getTransactions().stream()
                    .filter(tx -> tx.getStatus() == TransactionStatus.COMPLETED)
                    .map(TransactionModel::getPaidAt)
                    .filter(paidAt -> paidAt != null)
                    .max(Comparator.naturalOrder())
                    .orElse(null);
            if (fromTx != null) {
                return fromTx;
            }
        }
        if (order.getCreatedAt() != null) {
            return order.getCreatedAt();
        }
        return order.getUpdatedAt();
    }

    private long computeRemainingSeconds(LocalDateTime deadline) {
        return Math.max(Duration.between(LocalDateTime.now(), deadline).getSeconds(), 0L);
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
            LocalDateTime refundDeadlineAt
    ) {
    }
}
