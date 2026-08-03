package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
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
public class PrizePayoutComplaintEligibilityService {

    public static final String CATEGORY_SLOW_PROCESSING = "PRIZE_PAYOUT_SLOW_PROCESSING";
    public static final String CATEGORY_PAID_ISSUE = "PRIZE_PAYOUT_PAID_ISSUE";

    private static final int DEFAULT_WAIT_HOURS = 48;
    private static final int DEFAULT_GRACE_DAYS = 7;
    private static final int MAX_GRACE_DAYS = 15;

    private static final Set<PrizePayoutRequestStatus> SLOW_PROCESSING_STATUSES = EnumSet.of(
            PrizePayoutRequestStatus.PENDING,
            PrizePayoutRequestStatus.APPROVED);

    private static final Set<PrizePayoutRequestStatus> FINAL_STATUSES = EnumSet.of(
            PrizePayoutRequestStatus.COMPLETED,
            PrizePayoutRequestStatus.MANUAL_RESOLUTION);

    private final PrizePayoutRequestRepositoryPort prizePayoutRequestRepositoryPort;
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public void validate(TicketCategoryModel category, String refId, UUID customerId) {
        PrizePayoutRequestModel payout = loadOwnedPayout(refId, customerId);
        String code = category.getCode() != null ? category.getCode().trim() : "";

        switch (code) {
            case CATEGORY_SLOW_PROCESSING -> validateSlowProcessing(payout);
            case CATEGORY_PAID_ISSUE -> validatePaidIssue(payout);
            default -> throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }

        validateClosingWindowIfFinal(payout);
    }

    private PrizePayoutRequestModel loadOwnedPayout(String refId, UUID customerId) {
        Long payoutId;
        try {
            payoutId = Long.valueOf(refId.trim());
        } catch (NumberFormatException | NullPointerException ex) {
            throw new DomainException(ErrorCode.TICKET_REF_INVALID);
        }

        PrizePayoutRequestModel payout = prizePayoutRequestRepositoryPort.findById(payoutId)
                .orElseThrow(() -> new DomainException(ErrorCode.TICKET_REF_PRIZE_PAYOUT_MISMATCH));

        if (customerId == null || payout.getCustomerId() == null || !customerId.equals(payout.getCustomerId())) {
            throw new DomainException(ErrorCode.TICKET_REF_PRIZE_PAYOUT_MISMATCH);
        }
        return payout;
    }

    private void validateSlowProcessing(PrizePayoutRequestModel payout) {
        if (!SLOW_PROCESSING_STATUSES.contains(payout.getStatus())) {
            throw new DomainException(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_STATUS_INVALID);
        }

        int waitHours = getProcessingWaitHours();
        LocalDateTime updatedAt = payout.getUpdatedAt();
        if (updatedAt == null) {
            throw new DomainException(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_TOO_EARLY, null, waitHours);
        }

        long elapsedHours = Duration.between(updatedAt, LocalDateTime.now()).toHours();
        if (elapsedHours < waitHours) {
            throw new DomainException(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_TOO_EARLY, null, waitHours);
        }
    }

    private void validatePaidIssue(PrizePayoutRequestModel payout) {
        if (payout.getStatus() != PrizePayoutRequestStatus.COMPLETED) {
            throw new DomainException(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_STATUS_INVALID);
        }
    }

    private void validateClosingWindowIfFinal(PrizePayoutRequestModel payout) {
        if (!FINAL_STATUSES.contains(payout.getStatus())) {
            return;
        }

        int graceDays = getComplaintGraceDays();
        LocalDateTime anchor = payout.getCompletedAt() != null ? payout.getCompletedAt() : payout.getUpdatedAt();
        if (anchor == null) {
            return;
        }

        long elapsedDays = Duration.between(anchor, LocalDateTime.now()).toDays();
        if (elapsedDays > graceDays) {
            throw new DomainException(ErrorCode.TICKET_PRIZE_PAYOUT_COMPLAINT_WINDOW_EXPIRED, null, graceDays);
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
