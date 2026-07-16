package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderRefundPolicyService {

    public static final String DAILY_LIMIT_REASON =
            "Bạn đã đạt giới hạn số yêu cầu hoàn tiền trong ngày. Vui lòng thử lại vào ngày mai.";

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final OrderRefundProperties orderRefundProperties;

    public PolicyEvaluation evaluate(OrderModel order, UUID customerId) {
        // Order is retained for call-site consistency with ensureWithinPolicy / eligibility APIs.
        Objects.requireNonNull(order, "order");
        int maxPerDay = getMaxRefundRequestsPerDay();
        long submittedToday = countSubmittedToday(customerId);
        boolean dailyLimitReached = submittedToday >= maxPerDay;

        if (dailyLimitReached) {
            return new PolicyEvaluation(
                    false,
                    DAILY_LIMIT_REASON,
                    maxPerDay,
                    submittedToday,
                    true);
        }

        return new PolicyEvaluation(
                true,
                null,
                maxPerDay,
                submittedToday,
                false);
    }

    public void ensureWithinPolicy(OrderModel order, UUID customerId) {
        PolicyEvaluation evaluation = evaluate(order, customerId);
        if (evaluation.eligible()) {
            return;
        }
        if (evaluation.dailyLimitReached()) {
            throw new DomainException(ErrorCode.REFUND_DAILY_LIMIT_EXCEEDED, evaluation.reason());
        }
        throw new DomainException(ErrorCode.REFUND_WINDOW_EXPIRED, evaluation.reason());
    }

    public int getMaxRefundRequestsPerDay() {
        return readPositiveInt(
                SystemConfigEnum.MAX_REFUND_REQUESTS_PER_DAY,
                SystemConfigEnum.MAX_REFUND_REQUESTS_PER_DAY.getDefaultValue());
    }

    /**
     * Counts refund requests created since 00:00 of the current calendar day
     * in the configured timezone ({@link OrderRefundProperties#getTimezone()}).
     * The counter therefore resets automatically at midnight — no cron job required.
     */
    private long countSubmittedToday(UUID customerId) {
        if (customerId == null) {
            return 0L;
        }
        LocalDateTime startOfToday = LocalDate.now(resolveZoneId()).atStartOfDay();
        return refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(customerId, startOfToday);
    }

    private ZoneId resolveZoneId() {
        try {
            return ZoneId.of(orderRefundProperties.getTimezone());
        } catch (Exception ex) {
            return ZoneId.of("Asia/Ho_Chi_Minh");
        }
    }

    private int readPositiveInt(SystemConfigEnum configKey, String fallback) {
        String raw = systemConfigRepositoryPort
                .findActiveByConfigKey(configKey.name())
                .map(SystemConfigModel::getConfigValue)
                .orElse(fallback);
        try {
            int value = Integer.parseInt(raw.trim());
            if (value <= 0) {
                return Integer.parseInt(fallback);
            }
            return value;
        } catch (NumberFormatException ex) {
            return Integer.parseInt(fallback);
        }
    }

    public record PolicyEvaluation(
            boolean eligible,
            String reason,
            int maxRefundRequestsPerDay,
            long refundRequestsSubmittedToday,
            boolean dailyLimitReached
    ) {
    }
}
