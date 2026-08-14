package com.daiphat.coreapi.application.policy.streetagent;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.service.streetagent.VendorAllocationSuggestionBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * One read boundary for all settings captured by an allocation batch. Business values remain
 * editable System Config records; this class only validates and projects them for use cases.
 */
@Component
@RequiredArgsConstructor
public class VendorAllocationPolicyResolver {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public AllocationPolicy resolve() {
        BigDecimal commission = decimal(SystemConfigEnum.VENDOR_COMMISSION_RATE);
        BigDecimal deposit = decimal(SystemConfigEnum.VENDOR_DEPOSIT_RATE);
        validateRate(commission);
        validateRate(deposit);
        return new AllocationPolicy(
                commission,
                deposit,
                reservePolicy(),
                integer(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES),
                string(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY));
    }

    public VendorAllocationSuggestionBuilder.ReservePolicy reservePolicy() {
        BigDecimal reservePercent = decimal(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PERCENT_PER_STATION);
        validateRate(reservePercent);
        return new VendorAllocationSuggestionBuilder.ReservePolicy(
                integer(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION), reservePercent);
    }

    public BigDecimal vendorUnitPrice(BigDecimal faceValue, BigDecimal commissionRate) {
        validateRate(commissionRate);
        if (faceValue == null || faceValue.signum() < 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        return faceValue.multiply(BigDecimal.ONE.subtract(commissionRate)).setScale(0, RoundingMode.HALF_UP);
    }

    /** Default ceiling used only when a new contract does not specify one. */
    public int defaultContractMaxPerBatch() {
        int cap = integer(SystemConfigEnum.VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP);
        if (cap <= 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        return cap;
    }

    public String string(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(value -> value.getConfigValue())
                .orElse(key.getDefaultValue());
    }

    public BigDecimal decimal(SystemConfigEnum key) {
        try {
            return new BigDecimal(string(key).trim());
        } catch (RuntimeException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    public int integer(SystemConfigEnum key) {
        try {
            int value = Integer.parseInt(string(key).trim());
            if (value < 0) {
                throw new NumberFormatException("negative");
            }
            return value;
        } catch (RuntimeException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private void validateRate(BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(BigDecimal.ONE) > 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    public record AllocationPolicy(
            BigDecimal commissionRate,
            BigDecimal depositRate,
            VendorAllocationSuggestionBuilder.ReservePolicy counterReservePolicy,
            int draftReservationTtlMinutes,
            String lateReturnPolicy) {
    }
}
