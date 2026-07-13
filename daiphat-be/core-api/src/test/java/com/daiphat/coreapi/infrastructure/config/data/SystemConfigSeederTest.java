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
                .containsExactlyInAnyOrder(
                        "ORDER_CANCEL_GRACE_MIN",
                        "CUSTOMER_CANCEL_CUTOFF",
                        "ORDER_PREPARE_SLA_MIN",
                        "VENDOR_RETURN_CUTOFF",
                        "LATE_IMPORT_TIME",
                        "IMPORT_BATCH_CUTOFF_TIME",
                        "STAFF_INCIDENT_CUTOFF",
                        "INVALID_INFO_EXPIRED_DAYS",
                        "MAX_REFUND_REQUESTS_PER_DAY"
                );
        assertThat(captor.getAllValues()).allMatch(entity -> Boolean.TRUE.equals(entity.getIsActive()));
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
