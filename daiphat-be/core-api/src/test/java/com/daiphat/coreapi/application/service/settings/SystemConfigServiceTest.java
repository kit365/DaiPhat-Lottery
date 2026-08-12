package com.daiphat.coreapi.application.service.settings;

import com.daiphat.coreapi.application.dto.request.settings.UpdateSystemConfigRequest;
import com.daiphat.coreapi.application.dto.response.settings.SystemConfigResponse;
import com.daiphat.coreapi.application.mapper.settings.SystemConfigApplicationMapper;
import com.daiphat.coreapi.application.port.in.streetagent.VendorConfidenceServicePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigCachePort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.service.lotteries.SupplierPaymentCutOffSyncService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.ConfigType;
import com.daiphat.coreapi.domain.model.enums.settings.DataType;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SystemConfigService Unit Tests")
class SystemConfigServiceTest {

    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;

    @Mock
    private SystemConfigCachePort systemConfigCachePort;

    @Mock
    private VendorConfidenceServicePort vendorConfidenceServicePort;

    @Spy
    private SystemConfigApplicationMapper systemConfigApplicationMapper = new SystemConfigApplicationMapper();

    @Mock
    private SupplierPaymentCutOffSyncService supplierPaymentCutOffSyncService;

    @InjectMocks
    private SystemConfigService systemConfigService;

    private SystemConfigModel sampleConfig() {
        return SystemConfigModel.builder()
                .id(1L)
                .configKey("ORDER_CANCEL_GRACE_MIN")
                .configValue("30")
                .configType(ConfigType.ORDER_SETTING)
                .dataType(DataType.INT)
                .description("Grace minutes")
                .configName("Thời gian ân hạn hủy đơn")
                .unit("phút")
                .validationRules("{\"min\":1,\"max\":1440}")
                .isEditable(true)
                .isActive(true)
                .build();
    }

    @Nested
    @DisplayName("getAll")
    class GetAll {

        @Test
        void returnsAllConfigs_whenConfigTypeBlank() {
            when(systemConfigRepositoryPort.findAll()).thenReturn(List.of(sampleConfig()));

            List<SystemConfigResponse> result = systemConfigService.getAll(null);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().configKey()).isEqualTo("ORDER_CANCEL_GRACE_MIN");
            verify(systemConfigRepositoryPort).findAll();
            verify(systemConfigRepositoryPort, never()).findByConfigType(any());
        }

        @Test
        void filtersByConfigType() {
            when(systemConfigRepositoryPort.findByConfigType(ConfigType.ORDER_SETTING))
                    .thenReturn(List.of(sampleConfig()));

            List<SystemConfigResponse> result = systemConfigService.getAll("ORDER_SETTING");

            assertThat(result).hasSize(1);
            verify(systemConfigRepositoryPort).findByConfigType(ConfigType.ORDER_SETTING);
        }

        @Test
        void throws_whenConfigTypeInvalid() {
            assertThatThrownBy(() -> systemConfigService.getAll("NOT_A_TYPE"))
                    .isInstanceOf(DomainException.class)
                    .extracting(ex -> ((DomainException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.SYSTEM_CONFIG_TYPE_INVALID);
        }
    }

    @Nested
    @DisplayName("getConfigByKey")
    class GetConfigByKey {

        @Test
        void returnsCachedValue_withoutHittingRepository() {
            SystemConfigModel cached = sampleConfig();
            when(systemConfigCachePort.get("ORDER_CANCEL_GRACE_MIN")).thenReturn(Optional.of(cached));

            Optional<SystemConfigModel> result = systemConfigService.getConfigByKey("ORDER_CANCEL_GRACE_MIN");

            assertThat(result).contains(cached);
            verify(systemConfigRepositoryPort, never()).findActiveByConfigKey(any());
            verify(systemConfigCachePort, never()).put(any(), any(), any());
        }

        @Test
        void loadsFromDbAndCaches_onCacheMiss() {
            SystemConfigModel fromDb = sampleConfig();
            when(systemConfigCachePort.get("ORDER_CANCEL_GRACE_MIN")).thenReturn(Optional.empty());
            when(systemConfigRepositoryPort.findActiveByConfigKey("ORDER_CANCEL_GRACE_MIN"))
                    .thenReturn(Optional.of(fromDb));

            Optional<SystemConfigModel> result = systemConfigService.getConfigByKey("ORDER_CANCEL_GRACE_MIN");

            assertThat(result).contains(fromDb);
            verify(systemConfigCachePort).put(
                    eq("ORDER_CANCEL_GRACE_MIN"),
                    eq(fromDb),
                    eq(SystemConfigService.CACHE_TTL)
            );
        }

        @Test
        void returnsEmpty_whenMissingInCacheAndDb() {
            when(systemConfigCachePort.get("MISSING")).thenReturn(Optional.empty());
            when(systemConfigRepositoryPort.findActiveByConfigKey("MISSING")).thenReturn(Optional.empty());

            assertThat(systemConfigService.getConfigByKey("MISSING")).isEmpty();
            verify(systemConfigCachePort, never()).put(any(), any(), any());
        }

        @Test
        void returnsEmpty_whenKeyBlank() {
            assertThat(systemConfigService.getConfigByKey("  ")).isEmpty();
            verifyNoInteractions(systemConfigCachePort, systemConfigRepositoryPort);
        }
    }

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        void updatesValueAndEvictsCache() {
            SystemConfigModel existing = sampleConfig();
            when(systemConfigRepositoryPort.findById(1L)).thenReturn(Optional.of(existing));
            when(systemConfigRepositoryPort.save(any(SystemConfigModel.class))).thenAnswer(inv -> inv.getArgument(0));

            UpdateSystemConfigRequest request = new UpdateSystemConfigRequest(
                    "Thời gian ân hạn hủy đơn", "45", "Updated grace");
            SystemConfigResponse response = systemConfigService.update(1L, request);

            assertThat(response.configValue()).isEqualTo("45");
            assertThat(response.description()).isEqualTo("Updated grace");
            verify(systemConfigCachePort).evict("ORDER_CANCEL_GRACE_MIN");
            verify(supplierPaymentCutOffSyncService, never()).syncAllSuppliers();
        }

        @Test
        void syncsSupplierPaymentCutoff_whenVerificationDeadlineUpdated() {
            SystemConfigModel existing = SystemConfigModel.builder()
                    .id(3L)
                    .configKey("VERIFICATION_DEADLINE")
                    .configValue("17:00")
                    .configType(ConfigType.TICKET_RETURN)
                    .dataType(DataType.TIME)
                    .description("Hạn chót đối chiếu")
                    .configName("Hạn chót đối chiếu")
                    .unit("HH:mm")
                    .validationRules("{\"min\":\"00:00\",\"max\":\"23:59\"}")
                    .isEditable(true)
                    .isActive(true)
                    .build();
            when(systemConfigRepositoryPort.findById(3L)).thenReturn(Optional.of(existing));
            when(systemConfigRepositoryPort.save(any(SystemConfigModel.class))).thenAnswer(inv -> inv.getArgument(0));

            systemConfigService.update(
                    3L,
                    new UpdateSystemConfigRequest("Hạn chót đối chiếu", "17:30", "Updated"));

            verify(systemConfigCachePort).evict("VERIFICATION_DEADLINE");
            verify(supplierPaymentCutOffSyncService).syncAllSuppliers();
        }

        @Test
        void rejectsInvalidValue_andDoesNotEvict() {
            SystemConfigModel existing = sampleConfig();
            when(systemConfigRepositoryPort.findById(1L)).thenReturn(Optional.of(existing));

            UpdateSystemConfigRequest request = new UpdateSystemConfigRequest(
                    "Thời gian ân hạn hủy đơn", "abc", "bad");

            assertThatThrownBy(() -> systemConfigService.update(1L, request))
                    .isInstanceOf(DomainException.class)
                    .extracting(ex -> ((DomainException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);

            verify(systemConfigRepositoryPort, never()).save(any());
            verify(systemConfigCachePort, never()).evict(any());
        }

        @Test
        void rejectsOutOfRangeValue() {
            SystemConfigModel existing = sampleConfig();
            when(systemConfigRepositoryPort.findById(1L)).thenReturn(Optional.of(existing));

            UpdateSystemConfigRequest request = new UpdateSystemConfigRequest(
                    "Thời gian ân hạn hủy đơn", "2000", "too large");

            assertThatThrownBy(() -> systemConfigService.update(1L, request))
                    .isInstanceOf(DomainException.class)
                    .extracting(ex -> ((DomainException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.SYSTEM_CONFIG_VALUE_INVALID);

            verify(systemConfigRepositoryPort, never()).save(any());
            verify(systemConfigCachePort, never()).evict(any());
        }

        @Test
        void rejectsInvalidTime_withSpecificVietnameseMessage() {
            SystemConfigModel existing = SystemConfigModel.builder()
                    .id(2L)
                    .configKey("VENDOR_RETURN_CUTOFF")
                    .configValue("15:00")
                    .configType(ConfigType.VENDOR_SETTING)
                    .dataType(DataType.TIME)
                    .description("Giờ chốt trả vé")
                    .configName("Giờ chốt trả vé đại lý")
                    .unit("HH:mm")
                    .validationRules("{\"min\":\"00:00\",\"max\":\"23:59\"}")
                    .isEditable(true)
                    .isActive(true)
                    .build();
            when(systemConfigRepositoryPort.findById(2L)).thenReturn(Optional.of(existing));

            UpdateSystemConfigRequest request = new UpdateSystemConfigRequest(
                    "Giờ chốt trả vé đại lý", "17h00", "bad time");

            assertThatThrownBy(() -> systemConfigService.update(2L, request))
                    .isInstanceOf(DomainException.class)
                    .satisfies(ex -> {
                        DomainException domain = (DomainException) ex;
                        assertThat(domain.getErrorCode()).isEqualTo(ErrorCode.SYSTEM_CONFIG_TIME_INVALID);
                        assertThat(domain.getMessage())
                                .isEqualTo("Giờ chốt trả vé đại lý phải có định dạng HH:mm (ví dụ 17:00).");
                    });

            verify(systemConfigRepositoryPort, never()).save(any());
            verify(systemConfigCachePort, never()).evict(any());
        }

        @Test
        void acceptsCanonicalHhMmTime_andNormalizes() {
            SystemConfigModel existing = SystemConfigModel.builder()
                    .id(2L)
                    .configKey("VENDOR_RETURN_CUTOFF")
                    .configValue("15:00")
                    .configType(ConfigType.VENDOR_SETTING)
                    .dataType(DataType.TIME)
                    .description("Giờ chốt trả vé")
                    .configName("Giờ chốt trả vé đại lý")
                    .unit("HH:mm")
                    .validationRules("{\"min\":\"00:00\",\"max\":\"23:59\"}")
                    .isEditable(true)
                    .isActive(true)
                    .build();
            when(systemConfigRepositoryPort.findById(2L)).thenReturn(Optional.of(existing));
            when(systemConfigRepositoryPort.save(any(SystemConfigModel.class))).thenAnswer(inv -> inv.getArgument(0));

            SystemConfigResponse response = systemConfigService.update(
                    2L,
                    new UpdateSystemConfigRequest("Giờ chốt trả vé đại lý", "17:00", "Updated cutoff"));

            assertThat(response.configValue()).isEqualTo("17:00");
            verify(systemConfigCachePort).evict("VENDOR_RETURN_CUTOFF");
        }

        @Test
        void rejectsWhenNotEditable() {
            SystemConfigModel existing = sampleConfig();
            existing.setIsEditable(false);
            when(systemConfigRepositoryPort.findById(1L)).thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> systemConfigService.update(
                    1L, new UpdateSystemConfigRequest("Thời gian ân hạn hủy đơn", "45", "Updated grace")))
                    .isInstanceOf(DomainException.class)
                    .extracting(ex -> ((DomainException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.SYSTEM_CONFIG_NOT_EDITABLE);

            verify(systemConfigRepositoryPort, never()).save(any());
            verify(systemConfigCachePort, never()).evict(any());
        }

        @Test
        void throws_whenConfigNotFound() {
            when(systemConfigRepositoryPort.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> systemConfigService.update(
                    99L, new UpdateSystemConfigRequest("Tên cấu hình", "1", "x")))
                    .isInstanceOf(DomainException.class)
                    .extracting(ex -> ((DomainException) ex).getErrorCode())
                    .isEqualTo(ErrorCode.SYSTEM_CONFIG_NOT_FOUND);

            verify(systemConfigCachePort, never()).evict(any());
        }
    }
}
