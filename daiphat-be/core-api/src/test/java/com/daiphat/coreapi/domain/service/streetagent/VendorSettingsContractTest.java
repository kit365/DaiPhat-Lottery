package com.daiphat.coreapi.domain.service.streetagent;

import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import org.junit.jupiter.api.Test;

import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class VendorSettingsContractTest {

    private static final Set<SystemConfigEnum> REQUIRED_VENDOR_SETTINGS = EnumSet.of(
            SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION,
            SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PERCENT_PER_STATION,
            SystemConfigEnum.VENDOR_COMMISSION_RATE,
            SystemConfigEnum.VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP,
            SystemConfigEnum.VENDOR_DEFAULT_APPROVED_DAILY_CAP,
            SystemConfigEnum.VENDOR_DEPOSIT_RATE,
            SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES,
            SystemConfigEnum.VENDOR_RETURN_CUTOFF,
            SystemConfigEnum.VENDOR_LATE_RETURN_POLICY
    );

    @Test
    void defaults_match_business_contract() {
        assertThat(SystemConfigEnum.VENDOR_DEPOSIT_RATE.getDefaultValue()).isEqualTo("0.10");
        assertThat(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY.getDefaultValue()).isEqualTo("FORFEIT_DEPOSIT");
        assertThat(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PER_STATION.getDefaultValue()).isEqualTo("10");
        assertThat(SystemConfigEnum.STREET_AGENT_COUNTER_RESERVE_PERCENT_PER_STATION.getDefaultValue()).isEqualTo("0.20");
        assertThat(SystemConfigEnum.VENDOR_COMMISSION_RATE.getDefaultValue()).isEqualTo("0.10");
        assertThat(SystemConfigEnum.VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP.getDefaultValue()).isEqualTo("200");
        assertThat(SystemConfigEnum.VENDOR_DEFAULT_APPROVED_DAILY_CAP.getDefaultValue()).isEqualTo("100");
        assertThat(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES.getDefaultValue()).isEqualTo("15");
        assertThat(SystemConfigEnum.VENDOR_RETURN_CUTOFF.getDefaultValue()).isEqualTo("15:00");
    }

    @Test
    void minimum_vendor_tab_configs_are_vendor_setting() {
        assertThat(REQUIRED_VENDOR_SETTINGS).allSatisfy(config -> {
            assertThat(config.getConfigType()).isEqualTo(ConfigType.VENDOR_SETTING);
            assertThat(config.isEditable()).isTrue();
        });

        assertThat(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES.getDataType()).isEqualTo(DataType.INT);
        assertThat(SystemConfigEnum.VENDOR_DRAFT_RESERVATION_TTL_MINUTES.getValidationRules())
                .isEqualTo("{\"min\":1,\"max\":120}");
        assertThat(SystemConfigEnum.VENDOR_DEPOSIT_RATE.getValidationRules())
                .isEqualTo("{\"min\":0,\"max\":1}");
        assertThat(SystemConfigEnum.VENDOR_LATE_RETURN_POLICY.getValidationRules())
                .contains("FORFEIT_DEPOSIT")
                .contains("FORCE_PURCHASE_ALL");
        assertThat(SystemConfigEnum.VENDOR_RETURN_CUTOFF.getConfigType()).isEqualTo(ConfigType.VENDOR_SETTING);

        Set<String> vendorKeys = java.util.Arrays.stream(SystemConfigEnum.values())
                .filter(c -> c.getConfigType() == ConfigType.VENDOR_SETTING)
                .map(Enum::name)
                .collect(Collectors.toSet());
        assertThat(vendorKeys).containsAll(
                REQUIRED_VENDOR_SETTINGS.stream().map(Enum::name).collect(Collectors.toSet()));
    }
}
