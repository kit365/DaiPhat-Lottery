package com.daiphat.coreapi.application.policy.streetagent;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.streetagent.VendorConfidenceTier;
import com.daiphat.coreapi.domain.service.streetagent.VendorConfidenceCalculator;
import com.daiphat.coreapi.domain.service.streetagent.VendorConfidencePolicyValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class VendorConfidencePolicyResolver {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort;

    public VendorConfidenceCalculator.Policy resolveValidatedPolicy() {
        VendorConfidenceCalculator.Policy policy = new VendorConfidenceCalculator.Policy(
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_MIN_SCORE),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_MIN_SCORE),
                integer(SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_MIN_BATCHES),
                integer(SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_MIN_BATCHES),
                integer(SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_MIN_BATCHES),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_ON_TIME_WEIGHT),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT),
                integer(SystemConfigEnum.VENDOR_CONFIDENCE_EXPERIENCE_WINDOW)
        );
        VendorConfidencePolicyValidator.validateResolvedPolicy(policy);
        VendorConfidencePolicyValidator.validateCapMonotonicity(
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_NEW_CAP_PERCENT),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT),
                decimal(SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT)
        );
        return policy;
    }

    public BigDecimal capPercentage(VendorConfidenceTier tier) {
        SystemConfigEnum key = switch (tier == null ? VendorConfidenceTier.NEW : tier) {
            case NEW -> SystemConfigEnum.VENDOR_CONFIDENCE_NEW_CAP_PERCENT;
            case DEVELOPING -> SystemConfigEnum.VENDOR_CONFIDENCE_DEVELOPING_CAP_PERCENT;
            case ESTABLISHED -> SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_CAP_PERCENT;
            case TRUSTED -> SystemConfigEnum.VENDOR_CONFIDENCE_TRUSTED_CAP_PERCENT;
        };
        BigDecimal value = decimal(key);
        VendorConfidencePolicyValidator.requireRange01(value, key.name());
        return value;
    }

    private String stringConfig(SystemConfigEnum key) {
        return systemConfigRepositoryPort.findActiveByConfigKey(key.name())
                .map(c -> c.getConfigValue())
                .orElse(key.getDefaultValue());
    }

    private BigDecimal decimal(SystemConfigEnum key) {
        try {
            return new BigDecimal(stringConfig(key).trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }

    private int integer(SystemConfigEnum key) {
        try {
            return Integer.parseInt(stringConfig(key).trim());
        } catch (NumberFormatException ex) {
            throw new DomainException(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);
        }
    }
}
