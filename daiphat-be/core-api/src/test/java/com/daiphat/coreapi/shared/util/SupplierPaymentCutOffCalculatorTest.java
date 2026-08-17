package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SupplierPaymentCutOffCalculator")
class SupplierPaymentCutOffCalculatorTest {

    @Mock
    private SystemConfigRepositoryPort systemConfigRepositoryPort;

    @InjectMocks
    private SupplierPaymentCutOffCalculator calculator;

    @Test
    @DisplayName("calculate uses verification deadline + buffer minutes")
    void calculate_addsBuffer() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.VERIFICATION_DEADLINE.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder()
                        .configKey(SystemConfigEnum.VERIFICATION_DEADLINE.name())
                        .configValue("17:00")
                        .build()));
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder()
                        .configKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name())
                        .configValue("120")
                        .build()));

        assertThat(calculator.calculate()).isEqualTo(LocalTime.of(19, 0));
    }

    @Test
    @DisplayName("addBufferSameDay rejects wrap past midnight")
    void addBufferSameDay_rejectsOvernight() {
        assertThatThrownBy(() -> SupplierPaymentCutOffCalculator.addBufferSameDay(LocalTime.of(23, 0), 120))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("falls back to enum defaults when configs missing")
    void calculate_usesDefaults() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.VERIFICATION_DEADLINE.name()))
                .thenReturn(Optional.empty());
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name()))
                .thenReturn(Optional.empty());

        assertThat(calculator.calculate()).isEqualTo(LocalTime.of(19, 0));
    }
}
