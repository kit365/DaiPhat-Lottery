package com.daiphat.coreapi.application.service.streetagent;

import com.daiphat.coreapi.application.policy.streetagent.VendorAllocationPolicyResolver;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VendorAllocationPolicyResolverTest {

    @Test
    void resolves_allocation_policy_from_system_config() {
        SystemConfigRepositoryPort configs = configsWithDefaults();
        when(configs.findActiveByConfigKey(SystemConfigEnum.VENDOR_COMMISSION_RATE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.VENDOR_COMMISSION_RATE, "0.15")));

        var resolver = new VendorAllocationPolicyResolver(configs);
        var policy = resolver.resolve();

        assertThat(policy.commissionRate()).isEqualByComparingTo("0.15");
        assertThat(resolver.vendorUnitPrice(BigDecimal.valueOf(10_000), policy.commissionRate()))
                .isEqualByComparingTo("8500");
    }

    @Test
    void rejects_invalid_percentage_instead_of_silently_using_it() {
        SystemConfigRepositoryPort configs = configsWithDefaults();
        when(configs.findActiveByConfigKey(SystemConfigEnum.VENDOR_DEPOSIT_RATE.name()))
                .thenReturn(Optional.of(config(SystemConfigEnum.VENDOR_DEPOSIT_RATE, "1.01")));

        assertThatThrownBy(() -> new VendorAllocationPolicyResolver(configs).resolve())
                .isInstanceOf(DomainException.class);
    }

    private SystemConfigRepositoryPort configsWithDefaults() {
        SystemConfigRepositoryPort configs = mock(SystemConfigRepositoryPort.class);
        when(configs.findActiveByConfigKey(anyString())).thenAnswer(invocation -> {
            String key = invocation.getArgument(0);
            return Arrays.stream(SystemConfigEnum.values())
                    .filter(config -> config.name().equals(key))
                    .findFirst()
                    .map(config -> config(config, config.getDefaultValue()));
        });
        return configs;
    }

    private SystemConfigModel config(SystemConfigEnum key, String value) {
        return SystemConfigModel.builder().configKey(key.name()).configValue(value).build();
    }
}
