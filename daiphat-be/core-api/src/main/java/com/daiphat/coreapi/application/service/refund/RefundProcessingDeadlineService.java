package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumSet;

@Service
@RequiredArgsConstructor
public class RefundProcessingDeadlineService {

    private static final long NEAR_DEADLINE_SECONDS = Duration.ofDays(1).toSeconds();
    private static final EnumSet<RefundRequestStatus> PROCESSABLE_STATUSES = EnumSet.of(
            RefundRequestStatus.PENDING,
            RefundRequestStatus.WAITING_FOR_INFO,
            RefundRequestStatus.APPROVED,
            RefundRequestStatus.READY_TO_PAY);

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public int getProcessingExpiryDays() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.INVALID_INFO_EXPIRED_DAYS.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parseExpiryDays)
                .orElseGet(() -> parseExpiryDays(SystemConfigEnum.INVALID_INFO_EXPIRED_DAYS.getDefaultValue()));
    }

    public LocalDateTime computeDeadline(LocalDateTime createdAt) {
        if (createdAt == null) {
            return null;
        }
        return createdAt.plusDays(getProcessingExpiryDays());
    }

    public ProcessingEvaluation evaluate(RefundRequestModel refund) {
        if (refund == null || refund.getCreatedAt() == null || !PROCESSABLE_STATUSES.contains(refund.getStatus())) {
            return new ProcessingEvaluation(null, 0L, RefundProcessingUrgency.NOT_APPLICABLE);
        }

        LocalDateTime deadline = computeDeadline(refund.getCreatedAt());
        long remainingSeconds = Math.max(Duration.between(LocalDateTime.now(), deadline).toSeconds(), 0L);
        if (remainingSeconds <= 0) {
            return new ProcessingEvaluation(deadline, 0L, RefundProcessingUrgency.OVERDUE);
        }
        RefundProcessingUrgency urgency = remainingSeconds <= NEAR_DEADLINE_SECONDS
                ? RefundProcessingUrgency.NEAR_DEADLINE
                : RefundProcessingUrgency.ON_TIME;
        return new ProcessingEvaluation(deadline, remainingSeconds, urgency);
    }

    public boolean isOverdue(RefundRequestModel refund) {
        return evaluate(refund).processingUrgency() == RefundProcessingUrgency.OVERDUE;
    }

    public LocalDateTime computeExpiryThreshold(LocalDateTime now) {
        return now.minusDays(getProcessingExpiryDays());
    }

    private int parseExpiryDays(String rawValue) {
        try {
            int days = Integer.parseInt(rawValue.trim());
            if (days <= 0) {
                return Integer.parseInt(SystemConfigEnum.INVALID_INFO_EXPIRED_DAYS.getDefaultValue());
            }
            return days;
        } catch (NumberFormatException ex) {
            return Integer.parseInt(SystemConfigEnum.INVALID_INFO_EXPIRED_DAYS.getDefaultValue());
        }
    }

    public record ProcessingEvaluation(
            LocalDateTime processingDeadlineAt,
            Long remainingProcessingSeconds,
            RefundProcessingUrgency processingUrgency
    ) {
    }
}
