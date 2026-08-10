package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VendorConfidencePolicyValidatorTest {

    @Test
    void accepts_default_policy() {
        VendorConfidenceCalculator.Policy policy = new VendorConfidenceCalculator.Policy(
                new BigDecimal("40"), new BigDecimal("60"), new BigDecimal("80"),
                5, 10, 20,
                new BigDecimal("0.50"), new BigDecimal("0.40"), new BigDecimal("0.10"),
                30
        );
        assertThatCode(() -> VendorConfidencePolicyValidator.validateResolvedPolicy(policy))
                .doesNotThrowAnyException();
    }

    @Test
    void rejects_weights_not_summing_to_one() {
        VendorConfidenceCalculator.Policy policy = new VendorConfidenceCalculator.Policy(
                new BigDecimal("40"), new BigDecimal("60"), new BigDecimal("80"),
                5, 10, 20,
                new BigDecimal("0.50"), new BigDecimal("0.40"), new BigDecimal("0.20"),
                30
        );
        assertThatThrownBy(() -> VendorConfidencePolicyValidator.validateResolvedPolicy(policy))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void rejects_non_increasing_score_thresholds_on_update() {
        Map<SystemConfigEnum, String> current = defaults();
        assertThatThrownBy(() -> VendorConfidencePolicyValidator.validateUpdate(
                SystemConfigEnum.VENDOR_CONFIDENCE_ESTABLISHED_MIN_SCORE,
                "35",
                current
        )).isInstanceOf(DomainException.class);
    }

    @Test
    void rejects_non_monotonic_caps() {
        assertThatThrownBy(() -> VendorConfidencePolicyValidator.validateCapMonotonicity(
                new BigDecimal("0.80"),
                new BigDecimal("0.50"),
                new BigDecimal("0.75"),
                new BigDecimal("1.00")
        )).isInstanceOf(DomainException.class);
    }

    @Test
    void accepts_equal_caps_across_tiers() {
        assertThatCode(() -> VendorConfidencePolicyValidator.validateCapMonotonicity(
                new BigDecimal("0.25"),
                new BigDecimal("0.25"),
                new BigDecimal("0.75"),
                new BigDecimal("1.00")
        )).doesNotThrowAnyException();
    }

    @Test
    void validateFullPolicy_accepts_weight_swap_in_one_shot() {
        Map<SystemConfigEnum, String> values = defaults();
        values.put(SystemConfigEnum.VENDOR_CONFIDENCE_ON_TIME_WEIGHT, "0.40");
        values.put(SystemConfigEnum.VENDOR_CONFIDENCE_SELL_THROUGH_WEIGHT, "0.50");
        values.put(SystemConfigEnum.VENDOR_CONFIDENCE_EXPERIENCE_WEIGHT, "0.10");
        assertThatCode(() -> VendorConfidencePolicyValidator.validateFullPolicy(values))
                .doesNotThrowAnyException();
    }

    private static Map<SystemConfigEnum, String> defaults() {
        Map<SystemConfigEnum, String> map = new EnumMap<>(SystemConfigEnum.class);
        for (SystemConfigEnum key : SystemConfigEnum.values()) {
            if (VendorConfidencePolicyValidator.isConfidenceKey(key)) {
                map.put(key, key.getDefaultValue());
            }
        }
        return map;
    }
}
