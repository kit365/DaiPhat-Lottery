package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefundComplaintEligibilityService {

    public static final String CATEGORY_SLOW_PROCESSING = "REFUND_SLOW_PROCESSING";
    public static final String CATEGORY_PAID_ISSUE = "REFUND_PAID_ISSUE";

    private static final int DEFAULT_WAIT_HOURS = 48;
    private static final int DEFAULT_GRACE_DAYS = 7;
    private static final int MAX_GRACE_DAYS = 15;

    private static final Set<RefundRequestStatus> SLOW_PROCESSING_STATUSES = EnumSet.of(
            RefundRequestStatus.WAITING_FOR_INFO,
            RefundRequestStatus.READY_TO_PAY);

    private static final Set<RefundRequestStatus> FINAL_STATUSES = EnumSet.of(
            RefundRequestStatus.PAID,
            RefundRequestStatus.MANUAL_RESOLUTION);

    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public void validate(TicketCategoryModel category, String refId, UUID customerId) {
        RefundRequestModel refund = loadOwnedRefund(refId, customerId);
        String code = category.getCode() != null ? category.getCode().trim() : "";

        switch (code) {
            case CATEGORY_SLOW_PROCESSING -> validateSlowProcessing(refund);
            case CATEGORY_PAID_ISSUE -> validatePaidIssue(refund);
            default -> throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }

        validateClosingWindowIfFinal(refund);
    }

    private RefundRequestModel loadOwnedRefund(String refId, UUID customerId) {
        Long refundId;
        try {
            refundId = Long.valueOf(refId.trim());
        } catch (NumberFormatException | NullPointerException ex) {
            throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }

        RefundRequestModel refund = refundRequestRepositoryPort.findById(refundId)
                .orElseThrow(() -> new DomainException(ErrorCode.TICKET_REF_REFUND_MISMATCH));

        if (customerId == null || !customerId.equals(refund.getRequestedBy())) {
            throw new DomainException(ErrorCode.TICKET_REF_REFUND_MISMATCH);
        }
        return refund;
    }

    private void validateSlowProcessing(RefundRequestModel refund) {
        if (!SLOW_PROCESSING_STATUSES.contains(refund.getStatus())) {
            throw new DomainException(ErrorCode.TICKET_REFUND_COMPLAINT_STATUS_INVALID);
        }

        int waitHours = getProcessingWaitHours();
        LocalDateTime updatedAt = refund.getUpdatedAt();
        if (updatedAt == null) {
            throw new DomainException(ErrorCode.TICKET_REFUND_COMPLAINT_TOO_EARLY, null, waitHours);
        }

        long elapsedHours = Duration.between(updatedAt, LocalDateTime.now()).toHours();
        if (elapsedHours < waitHours) {
            throw new DomainException(ErrorCode.TICKET_REFUND_COMPLAINT_TOO_EARLY, null, waitHours);
        }
    }

    private void validatePaidIssue(RefundRequestModel refund) {
        if (refund.getStatus() != RefundRequestStatus.PAID) {
            throw new DomainException(ErrorCode.TICKET_REFUND_COMPLAINT_STATUS_INVALID);
        }
    }

    private void validateClosingWindowIfFinal(RefundRequestModel refund) {
        if (!FINAL_STATUSES.contains(refund.getStatus())) {
            return;
        }

        int graceDays = getComplaintGraceDays();
        LocalDateTime updatedAt = refund.getUpdatedAt();
        if (updatedAt == null) {
            return;
        }

        long elapsedDays = Duration.between(updatedAt, LocalDateTime.now()).toDays();
        if (elapsedDays > graceDays) {
            throw new DomainException(ErrorCode.TICKET_REFUND_COMPLAINT_WINDOW_EXPIRED, null, graceDays);
        }
    }

    int getProcessingWaitHours() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.REFUND_COMPLAINT_PROCESSING_WAIT_HOURS.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parseWaitHours)
                .orElse(DEFAULT_WAIT_HOURS);
    }

    int getComplaintGraceDays() {
        return systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.REFUND_COMPLAINT_GRACE_DAYS.name())
                .map(SystemConfigModel::getConfigValue)
                .map(this::parseGraceDays)
                .orElse(DEFAULT_GRACE_DAYS);
    }

    private int parseWaitHours(String rawValue) {
        try {
            int hours = Integer.parseInt(rawValue.trim());
            if (hours <= 0) {
                return DEFAULT_WAIT_HOURS;
            }
            return hours;
        } catch (NumberFormatException ex) {
            return DEFAULT_WAIT_HOURS;
        }
    }

    private int parseGraceDays(String rawValue) {
        try {
            int days = Integer.parseInt(rawValue.trim());
            if (days < 1) {
                return DEFAULT_GRACE_DAYS;
            }
            return Math.min(days, MAX_GRACE_DAYS);
        } catch (NumberFormatException ex) {
            return DEFAULT_GRACE_DAYS;
        }
    }
}
