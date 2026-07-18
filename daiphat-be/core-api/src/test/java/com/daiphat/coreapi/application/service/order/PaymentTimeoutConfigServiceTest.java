package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("PaymentTimeoutConfigService")
class PaymentTimeoutConfigServiceTest {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private PaymentTimeoutConfigService service;

    @BeforeEach
    void setUp() {
        service = new PaymentTimeoutConfigService(systemConfigRepositoryPort);
    }

    @Test
    void defaultsToThreeMinutesWhenMissing() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.PAYMENT_TIMEOUT_MINUTES.name()))
                .thenReturn(Optional.empty());

        assertThat(service.getTimeoutMinutes()).isEqualTo(3);
        assertThat(service.getTimeoutSeconds()).isEqualTo(180L);
        assertThat(service.getTimeoutCancelReason()).isEqualTo("Quá thời gian thanh toán 3 phút.");
    }

    @Test
    void usesConfiguredValue() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.PAYMENT_TIMEOUT_MINUTES.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("5").build()));

        assertThat(service.getTimeoutMinutes()).isEqualTo(5);
        assertThat(service.getTimeoutSeconds()).isEqualTo(300L);
        assertThat(service.getTimeoutCancelReason()).isEqualTo("Quá thời gian thanh toán 5 phút.");
    }

    @Test
    void fallsBackOnInvalidOrNonPositiveValue() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.PAYMENT_TIMEOUT_MINUTES.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("0").build()));

        assertThat(service.getTimeoutMinutes()).isEqualTo(3);
    }
}
