package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;
import java.util.function.Function;

/**
 * Cross-field validation for vendor confidence settings.
 * Individual min/max still come from {@link SystemConfigEnum} validationRules.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VendorConfidencePolicyValidator {

    private static final BigDecimal ONE = BigDecimal.ONE;

    public static void validateResolvedPolicy(VendorConfidenceCalculator.Policy policy) {
        requireRange01(policy.onTimeWeight(), "onTimeWeight");
        requireRange01(policy.sellThroughWeight(), "sellThroughWeight");
        requireRange01(policy.experienceWeight(), "experienceWeight");
        BigDecimal sum = policy.onTimeWeight()
                .add(policy.sellThroughWeight())
                .add(policy.experienceWeight())
                .setScale(4, RoundingMode.HALF_UP);
        if (sum.compareTo(ONE.setScale(4, RoundingMode.HALF_UP)) != 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (policy.developingMinScore().compareTo(BigDecimal.ZERO) < 0
                || policy.trustedMinScore().compareTo(BigDecimal.valueOf(100)) > 0
                || policy.developingMinScore().compareTo(policy.establishedMinScore()) >= 0
                || policy.establishedMinScore().compareTo(policy.trustedMinScore()) >= 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (policy.developingMinBatches() <= 0 || policy.establishedMinBatches() <= 0
                || policy.trustedMinBatches() <= 0
                || policy.developingMinBatches() >= policy.establishedMinBatches()
                || policy.establishedMinBatches() >= policy.trustedMinBatches()) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
        if (policy.experienceWindow() <= 0 || policy.trustedMinBatches() > policy.experienceWindow()) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    public static void validateCapMonotonicity(
            BigDecimal newCap,
            BigDecimal developingCap,
            BigDecimal establishedCap,
            BigDecimal trustedCap
    ) {
        requireRange01(newCap, "newCap");
        requireRange01(developingCap, "developingCap");
        requireRange01(establishedCap, "establishedCap");
        requireRange01(trustedCap, "trustedCap");
        if (newCap.compareTo(developingCap) > 0
                || developingCap.compareTo(establishedCap) > 0
                || establishedCap.compareTo(trustedCap) > 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    /**
     * Validates a full confidence policy map (all keys) in one shot — used by bulk update.
     */
    public static void validateFullPolicy(Map<SystemConfigEnum, String> values) {
        Function<SystemConfigEnum, String> valueOf = key ->
                values.getOrDefault(key, key.getDefaultValue());

        VendorConfidenceCalculator.Policy policy = new VendorConfidenceCalculator.Policy(
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_MIN_SCORE)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_MIN_SCORE)),
                integer(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_MIN_BATCHES)),
                integer(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_MIN_BATCHES)),
                integer(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_MIN_BATCHES)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_ON_TIME_WEIGHT)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT)),
                integer(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_EXPERIENCE_WINDOW))
        );
        validateResolvedPolicy(policy);
        validateCapMonotonicity(
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_NEW_CAP_PERCENT)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT)),
                decimal(valueOf.apply(SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT))
        );
    }

    /**
     * Validates a candidate update against the remaining resolved confidence settings.
     */
    public static void validateUpdate(
            SystemConfigEnum updatedKey,
            String updatedValue,
            Map<SystemConfigEnum, String> currentValues
    ) {
        Map<SystemConfigEnum, String> merged = new java.util.EnumMap<>(SystemConfigEnum.class);
        merged.putAll(currentValues);
        merged.put(updatedKey, updatedValue);
        validateFullPolicy(merged);
    }

    public static boolean isConfidenceKey(SystemConfigEnum key) {
        return key != null && key.name().startsWith("VENDOR_CONFIDENCE_");
    }

    public static void requireRange01(BigDecimal value, String label) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(ONE) > 0) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID, null, label);
        }
    }

    private static BigDecimal decimal(String raw) {
        try {
            return new BigDecimal(raw.trim());
        } catch (Exception ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private static int integer(String raw) {
        try {
            return Integer.parseInt(raw.trim());
        } catch (Exception ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
}
