package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalTime;

/**
 * Derives supplier {@code payment_cut_off_time} from global system configs:
 * {@code VERIFICATION_DEADLINE + SETTLEMENT_BUFFER_TIME}.
 */
@Component
@RequiredArgsConstructor
public class SupplierPaymentCutOffCalculator {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public LocalTime calculate() {
        LocalTime verificationDeadline = resolveVerificationDeadline();
        int bufferMinutes = resolveSettlementBufferMinutes();
        return addBufferSameDay(verificationDeadline, bufferMinutes);
    }

    public LocalTime resolveVerificationDeadline() {
        SystemConfigEnum key = SystemConfigEnum.VERIFICATION_DEADLINE;
        String raw = systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(SystemConfigModel::getConfigValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(key.getDefaultValue());
        return SystemConfigValueValidator.parseLocalTime(raw, key.getConfigName());
    }

    public int resolveSettlementBufferMinutes() {
        SystemConfigEnum key = SystemConfigEnum.SETTLEMENT_BUFFER_TIME;
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
     * Adds buffer minutes to a wall-clock time without wrapping to the next calendar day.
     */
    static LocalTime addBufferSameDay(LocalTime verificationDeadline, int bufferMinutes) {
        if (verificationDeadline == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu hạn chót đối chiếu");
        }
        if (bufferMinutes < 0) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thời gian đệm đối soát không được âm");
        }
        long totalSeconds = verificationDeadline.toSecondOfDay() + (long) bufferMinutes * 60L;
        if (totalSeconds >= 24L * 60L * 60L) {
            throw new DomainException(
                    ErrorCode.INVALID_INPUT,
                    "Giờ thanh toán (" + verificationDeadline + " + " + bufferMinutes
                            + " phút) vượt quá 23:59 trong cùng ngày. Giảm hạn chót đối chiếu hoặc thời gian đệm."
            );
        }
        return LocalTime.ofSecondOfDay(totalSeconds);
    }
}
