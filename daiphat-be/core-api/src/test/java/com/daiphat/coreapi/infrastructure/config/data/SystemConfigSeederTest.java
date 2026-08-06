package com.daiphat.coreapi.infrastructure.config.data;

import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.infrastructure.persistence.entity.settings.SystemConfigEntity;
import com.daiphat.coreapi.infrastructure.persistence.repository.settings.SystemConfigRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SystemConfigSeeder Unit Tests")
class SystemConfigSeederTest {

    @Mock
    private SystemConfigRepository configRepository;

    @InjectMocks
    private SystemConfigSeeder systemConfigSeeder;

    @Test
    void syncConfigsWithEnum_insertsMissingEnumEntries() {
        when(configRepository.findAll()).thenReturn(new ArrayList<>());
        when(configRepository.save(any(SystemConfigEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        systemConfigSeeder.syncConfigsWithEnum();

        ArgumentCaptor<SystemConfigEntity> captor = ArgumentCaptor.forClass(SystemConfigEntity.class);
        verify(configRepository, times(SystemConfigEnum.values().length)).save(captor.capture());

        assertThat(captor.getAllValues())
                .extracting(SystemConfigEntity::getConfigKey)
                .containsExactlyInAnyOrderElementsOf(
                        java.util.Arrays.stream(SystemConfigEnum.values())
                                .map(Enum::name)
                                .toList()
                );
        assertThat(captor.getAllValues()).allMatch(entity -> Boolean.TRUE.equals(entity.getIsActive()));
        assertThat(captor.getAllValues()).allMatch(entity ->
                entity.getConfigName() != null && !entity.getConfigName().isBlank());
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().startsWith("SITE_"))
                .extracting(SystemConfigEntity::getConfigType)
                .containsOnly(ConfigType.GENERAL_SETTING);
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().startsWith("PAGE_"))
                .extracting(SystemConfigEntity::getConfigType)
                .containsOnly(ConfigType.STATIC_PAGE);
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().startsWith("REFUND_COMPLAINT_"))
                .extracting(SystemConfigEntity::getConfigType)
                .containsOnly(ConfigType.COMPLAINT_SETTING);
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().equals("SUPPORT_TICKET_AUTO_CLOSE_HOURS"))
                .singleElement()
                .satisfies(entity -> {
                    assertThat(entity.getConfigType()).isEqualTo(ConfigType.COMPLAINT_SETTING);
                    assertThat(entity.getConfigValue()).isEqualTo("48");
                });
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().equals("PAYMENT_TIMEOUT_MINUTES"))
                .singleElement()
                .satisfies(entity -> {
                    assertThat(entity.getConfigType()).isEqualTo(ConfigType.PAYMENT_SETTING);
                    assertThat(entity.getConfigValue()).isEqualTo("3");
                });
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().startsWith("ORDER_")
                        && entity.getConfigKey().contains("COMPLAINT"))
                .extracting(SystemConfigEntity::getConfigType)
                .containsOnly(ConfigType.COMPLAINT_SETTING);
        assertThat(captor.getAllValues())
                .filteredOn(entity -> "ORDER_CANCEL_GRACE_MIN".equals(entity.getConfigKey()))
                .first()
                .satisfies(entity -> {
                    assertThat(entity.getConfigName()).isEqualTo("Thời gian ân hạn hủy đơn");
                    assertThat(entity.getUnit()).isEqualTo("phút");
                    assertThat(entity.getValidationRules()).isEqualTo("{\"min\":1,\"max\":1440}");
                });
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().equals("VENDOR_DRAFT_RESERVATION_TTL_MINUTES"))
                .singleElement()
                .satisfies(entity -> {
                    assertThat(entity.getConfigType()).isEqualTo(ConfigType.VENDOR_SETTING);
                    assertThat(entity.getDataType()).isEqualTo(DataType.INT);
                    assertThat(entity.getConfigValue()).isEqualTo("15");
                    assertThat(entity.getValidationRules()).isEqualTo("{\"min\":1,\"max\":120}");
                });
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigKey().equals("VENDOR_RETURN_CUTOFF"))
                .singleElement()
                .satisfies(entity -> {
                    assertThat(entity.getConfigType()).isEqualTo(ConfigType.VENDOR_SETTING);
                    assertThat(entity.getDataType()).isEqualTo(DataType.TIME);
                    assertThat(entity.getConfigValue()).isEqualTo("15:00");
                });
        assertThat(captor.getAllValues())
                .filteredOn(entity -> entity.getConfigType() == ConfigType.VENDOR_SETTING)
                .extracting(SystemConfigEntity::getConfigKey)
                .contains(
                        "STREET_AGENT_COUNTER_RESERVE_PER_STATION",
                        "VENDOR_DEFAULT_UNIT_PRICE",
                        "VENDOR_DEPOSIT_RATE",
                        "VENDOR_DRAFT_RESERVATION_TTL_MINUTES",
                        "VENDOR_RETURN_CUTOFF",
                        "VENDOR_LATE_RETURN_POLICY"
                );
    }

    @Test
    void syncConfigsWithEnum_reactivatesInactiveRecord() {
        SystemConfigEntity inactive = SystemConfigEntity.builder()
                .id(1L)
                .configKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name())
                .configValue("99")
                .configType(ConfigType.ORDER_SETTING)
                .dataType(DataType.INT)
                .description("Existing")
                .isActive(false)
                .build();

        when(configRepository.findAll()).thenReturn(new ArrayList<>(List.of(inactive)));
        when(configRepository.save(any(SystemConfigEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        systemConfigSeeder.syncConfigsWithEnum();

        assertThat(inactive.getIsActive()).isTrue();
        assertThat(inactive.getConfigValue()).isEqualTo("99");
    }

    @Test
    void syncConfigsWithEnum_updatesMetadataWithoutChangingValue() {
        SystemConfigEntity existing = SystemConfigEntity.builder()
                .id(1L)
                .configKey(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.name())
                .configValue("99")
                .configType(ConfigType.ORDER_SETTING)
                .dataType(DataType.INT)
                .description("stale")
                .configName("stale name")
                .unit("stale")
                .validationRules("{}")
                .isEditable(false)
                .isActive(true)
                .build();

        when(configRepository.findAll()).thenReturn(new ArrayList<>(List.of(existing)));
        when(configRepository.save(any(SystemConfigEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        systemConfigSeeder.syncConfigsWithEnum();

        assertThat(existing.getConfigValue()).isEqualTo("99");
        assertThat(existing.getConfigName()).isEqualTo(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getConfigName());
        assertThat(existing.getUnit()).isEqualTo(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getUnit());
        assertThat(existing.getValidationRules())
                .isEqualTo(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getValidationRules());
        assertThat(existing.getIsEditable()).isTrue();
        assertThat(existing.getDescription()).isEqualTo(SystemConfigEnum.ORDER_CANCEL_GRACE_MIN.getDescription());
    }

    @Test
    void syncConfigsWithEnum_reactivatesMigrationInsertedThresholdNotPreviouslyInEnum() {
        SystemConfigEntity threshold = SystemConfigEntity.builder()
                .id(50L)
                .configKey("TICKET_AUTO_IMPORT_THRESHOLD")
                .configValue("50")
                .configType(ConfigType.TICKET_IMPORT)
                .dataType(DataType.INT)
                .description("Seeded by migration")
                .configName("Ngưỡng số lượng vé tự động nhập")
                .unit("vé")
                .isEditable(true)
                .isActive(false)
                .build();

        when(configRepository.findAll()).thenReturn(new ArrayList<>(List.of(threshold)));
        when(configRepository.save(any(SystemConfigEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        systemConfigSeeder.syncConfigsWithEnum();

        assertThat(threshold.getIsActive()).isTrue();
        assertThat(threshold.getConfigValue()).isEqualTo("50");
        assertThat(threshold.getConfigType()).isEqualTo(ConfigType.TICKET_IMPORT);
    }

    @Test
    void syncConfigsWithEnum_softDeletesObsoleteActiveRecord() {
        SystemConfigEntity obsolete = SystemConfigEntity.builder()
                .id(99L)
                .configKey("LEGACY_CONFIG")
                .configValue("old")
                .configType(ConfigType.ORDER_SETTING)
                .dataType(DataType.INT)
                .description("Legacy")
                .isActive(true)
                .build();

        when(configRepository.findAll()).thenReturn(new ArrayList<>(List.of(obsolete)));
        when(configRepository.save(any(SystemConfigEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        systemConfigSeeder.syncConfigsWithEnum();

        assertThat(obsolete.getIsActive()).isFalse();
    }
}
