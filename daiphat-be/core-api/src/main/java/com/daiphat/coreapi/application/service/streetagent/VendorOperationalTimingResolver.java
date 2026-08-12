package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.streetagent.VendorAllocationSerialModel;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.SystemConfigValueValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.Objects;

/**
 * Single source of truth for the time window in which a street-agent batch may be handed over.
 * <p>
 * The operational deadline is the earlier of the configured vendor cutoff and the earliest
 * supplier-return cutoff minus the preparation buffer. All callers pass one command timestamp
 * into this resolver so a command cannot classify its own state against several clock reads.
 */
@Component
@RequiredArgsConstructor
public class VendorOperationalTimingResolver {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public LocalDateTime now() {
        return LocalDateTime.now(DrawScheduleUtils.VIETNAM_ZONE);
    }

    public void requireBusinessDateCurrentOrFuture(LocalDate businessDate, LocalDateTime at) {
        if (businessDate == null || at == null || businessDate.isBefore(at.toLocalDate())) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_BUSINESS_DATE_PASSED);
        }
    }

    public boolean isBusinessDatePast(LocalDate businessDate, LocalDateTime at) {
        return businessDate == null || at == null || businessDate.isBefore(at.toLocalDate());
    }

    /** Fast guard used before candidate/serial loading. */
    public void requireConfiguredVendorCutoffOpen(LocalDate businessDate, LocalDateTime at) {
        requireBusinessDateCurrentOrFuture(businessDate, at);
        LocalDateTime cutoff = businessDate.atTime(configuredVendorCutoff());
        if (!at.isBefore(cutoff)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_RETURN_CUTOFF_REACHED);
        }
    }

    public LocalTime configuredVendorCutoff() {
        return SystemConfigValueValidator.parseLocalTime(
                configValue(SystemConfigEnum.VENDOR_RETURN_CUTOFF),
                SystemConfigEnum.VENDOR_RETURN_CUTOFF.getConfigName());
    }

    /**
     * Resolves the exact deadline for the serial composition being handed over.
     * A batch cannot be quoted or confirmed if even one physical serial lacks a supplier cutoff.
     */
    public OperationalTiming resolveForHandover(
            LocalDate businessDate,
            Collection<VendorAllocationSerialModel> serials,
            LocalDateTime at) {
        requireBusinessDateCurrentOrFuture(businessDate, at);
        if (serials == null || serials.isEmpty()) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SERIAL_INVALID);
        }

        LocalTime supplierCutoff = serials.stream()
                .map(VendorAllocationSerialModel::getSupplierReturnCutoffTime)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElseThrow(() -> new DomainException(ErrorCode.VENDOR_ALLOCATION_SUPPLIER_RETURN_CUTOFF_MISSING));
        if (serials.stream().anyMatch(serial -> serial.getSupplierReturnCutoffTime() == null)) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_SUPPLIER_RETURN_CUTOFF_MISSING);
        }

        LocalTime vendorCutoff = configuredVendorCutoff();
        int bufferMinutes = returnBufferMinutes();
        LocalDateTime vendorDeadline = businessDate.atTime(vendorCutoff);
        LocalDateTime supplierSafeDeadline = businessDate.atTime(supplierCutoff).minusMinutes(bufferMinutes);
        LocalDateTime effectiveDeadline = vendorDeadline.isBefore(supplierSafeDeadline)
                ? vendorDeadline
                : supplierSafeDeadline;

        return new OperationalTiming(
                businessDate,
                vendorCutoff,
                supplierCutoff,
                bufferMinutes,
                vendorDeadline,
                supplierSafeDeadline,
                effectiveDeadline);
    }

    public void requireHandoverDeadlineOpen(OperationalTiming timing, LocalDateTime at) {
        if (timing == null || at == null || !at.isBefore(timing.effectiveDeadline())) {
            throw new DomainException(ErrorCode.VENDOR_ALLOCATION_OPERATIONAL_DEADLINE_REACHED);
        }
    }

    public boolean isDraftExpired(LocalDateTime reservationExpiresAt, OperationalTiming timing, LocalDateTime at) {
        if (reservationExpiresAt == null || at == null) {
            return true;
        }
        LocalDateTime effectiveExpiry = reservationExpiresAt.isBefore(timing.effectiveDeadline())
                ? reservationExpiresAt
                : timing.effectiveDeadline();
        return !at.isBefore(effectiveExpiry);
    }

    private int returnBufferMinutes() {
        try {
            int value = Integer.parseInt(configValue(SystemConfigEnum.RETURN_BUFFER_TIME).trim());
            if (value < 0) {
                throw new NumberFormatException("negative buffer");
            }
            return value;
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private String configValue(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(config -> config.getConfigValue())
                .orElse(key.getDefaultValue());
    }

    public record OperationalTiming(
            LocalDate businessDate,
            LocalTime vendorCutoff,
            LocalTime supplierReturnCutoff,
            int bufferMinutes,
            LocalDateTime vendorDeadline,
            LocalDateTime supplierSafeDeadline,
            LocalDateTime effectiveDeadline) {
    }
}
