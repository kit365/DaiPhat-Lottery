package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Settlement timing helpers based on each supplier's {@code paymentCutOffTime}
 * plus system configs {@code SETTLEMENT_BUFFER_TIME} /
 * {@code SETTLEMENT_PAYMENT_REMINDER_MINUTES}.
 *
 * <p>Reconciliation starts at {@code paymentCutOff − buffer}. When buffer is {@code 0},
 * reconciliation may start anytime from 00:00 of the settlement period day.
 */
@Component
@RequiredArgsConstructor
public class SupplierPaymentCutOffCalculator {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    /** When staff should start reconciliation relative to a supplier payment cut-off. */
    public LocalTime resolveReconciliationStart(LocalTime paymentCutOff) {
        int buffer = resolveSettlementBufferMinutes();
        if (buffer <= 0) {
            return LocalTime.MIN;
        }
        return subtractBufferSameDay(paymentCutOff, buffer);
    }

    /**
     * {@code true} when reconciliation actions are allowed for {@code periodFrom}.
     * Buffer {@code 0} → allowed from 00:00 that day; otherwise from paymentCutOff − buffer.
     */
    public boolean isReconciliationWindowOpen(
            LocalDate periodFrom,
            LocalTime paymentCutOff,
            LocalDateTime now
    ) {
        if (periodFrom == null || paymentCutOff == null || now == null) {
            return false;
        }
        int buffer = resolveSettlementBufferMinutes();
        LocalDateTime windowStart = buffer <= 0
                ? LocalDateTime.of(periodFrom, LocalTime.MIN)
                : LocalDateTime.of(periodFrom, paymentCutOff).minusMinutes(buffer);
        return !now.isBefore(windowStart);
    }

    public LocalDateTime reconciliationWindowStartAt(LocalDate periodFrom, LocalTime paymentCutOff) {
        if (periodFrom == null || paymentCutOff == null) {
            return null;
        }
        int buffer = resolveSettlementBufferMinutes();
        if (buffer <= 0) {
            return LocalDateTime.of(periodFrom, LocalTime.MIN);
        }
        return LocalDateTime.of(periodFrom, paymentCutOff).minusMinutes(buffer);
    }

    public int resolveSettlementBufferMinutes() {
        return resolveIntConfig(SystemConfigEnum.SETTLEMENT_BUFFER_TIME);
    }

    public int resolvePaymentReminderMinutes() {
        return Math.max(1, resolveIntConfig(SystemConfigEnum.SETTLEMENT_PAYMENT_REMINDER_MINUTES));
    }

    private int resolveIntConfig(SystemConfigEnum key) {
        String raw = systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(key.getDefaultValue());
        try {
            return Math.max(0, Integer.parseInt(raw.trim()));
        } catch (NumberFormatException ex) {
            return Integer.parseInt(key.getDefaultValue());
        }
    }

    /**
     * Subtracts buffer minutes from a wall-clock time without wrapping to the previous calendar day.
     */
    static LocalTime subtractBufferSameDay(LocalTime paymentCutOff, int bufferMinutes) {
        if (paymentCutOff == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu giờ thanh toán NCC");
        }
        if (bufferMinutes < 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thời gian đệm đối soát không được âm");
        }
        long totalSeconds = paymentCutOff.toSecondOfDay() - (long) bufferMinutes * 60L;
        if (totalSeconds < 0L) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Giờ bắt đầu đối soát (" + paymentCutOff + " − " + bufferMinutes
                            + " phút) trước 00:00. Giảm thời gian đệm hoặc tăng giờ thanh toán của nhà cung cấp."
            );
        }
        return LocalTime.ofSecondOfDay(totalSeconds);
    }
}
