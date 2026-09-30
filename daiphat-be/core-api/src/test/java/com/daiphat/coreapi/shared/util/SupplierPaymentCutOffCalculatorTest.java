package com.daiphat.coreapi.shared.util;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    @DisplayName("reconciliation start is payment cut-off minus buffer")
    void resolveReconciliationStart_subtractsBuffer() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder()
                        .configKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name())
                        .configValue("120")
                        .build()));

        assertThat(calculator.resolveReconciliationStart(LocalTime.of(19, 0))).isEqualTo(LocalTime.of(17, 0));
    }

    @Test
    @DisplayName("buffer 0 opens reconciliation from start of day")
    void isReconciliationWindowOpen_zeroBuffer() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder()
                        .configKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name())
                        .configValue("0")
                        .build()));

        assertThat(calculator.isReconciliationWindowOpen(
                LocalDate.of(2026, 8, 16),
                LocalTime.of(19, 0),
                LocalDateTime.of(2026, 8, 16, 8, 0)
        )).isTrue();
        assertThat(calculator.isReconciliationWindowOpen(
                LocalDate.of(2026, 8, 16),
                LocalTime.of(19, 0),
                LocalDateTime.of(2026, 8, 15, 23, 59)
        )).isFalse();
        assertThat(calculator.resolveOpeningStatus(
                LocalDate.of(2026, 8, 16),
                LocalTime.of(19, 0),
                LocalDateTime.of(2026, 8, 16, 0, 0)
        )).isEqualTo(SupplierSettlementStatus.OPEN);
    }

    @Test
    @DisplayName("future settlement stays NOT_OPEN until its own payment cutoff minus buffer")
    void resolveOpeningStatus_usesSettlementPeriodNotToday() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder()
                        .configKey(SystemConfigEnum.SETTLEMENT_BUFFER_TIME.name())
                        .configValue("60")
                        .build()));

        LocalDate tomorrow = LocalDate.of(2026, 10, 1);
        LocalTime paymentCutOff = LocalTime.of(18, 30);

        assertThat(calculator.resolveOpeningStatus(
                tomorrow,
                paymentCutOff,
                LocalDateTime.of(2026, 9, 30, 18, 0)
        )).isEqualTo(SupplierSettlementStatus.NOT_OPEN);
        assertThat(calculator.resolveOpeningStatus(
                tomorrow,
                paymentCutOff,
                LocalDateTime.of(2026, 10, 1, 17, 29, 59)
        )).isEqualTo(SupplierSettlementStatus.NOT_OPEN);
        assertThat(calculator.resolveOpeningStatus(
                tomorrow,
                paymentCutOff,
                LocalDateTime.of(2026, 10, 1, 17, 30)
        )).isEqualTo(SupplierSettlementStatus.OPEN);
    }

    @Test
    @DisplayName("subtractBufferSameDay rejects wrap before midnight")
    void subtractBufferSameDay_rejectsOvernight() {
        assertThatThrownBy(() -> SupplierPaymentCutOffCalculator.subtractBufferSameDay(LocalTime.of(1, 0), 120))
                .isInstanceOf(DomainException.class);
    }
}
