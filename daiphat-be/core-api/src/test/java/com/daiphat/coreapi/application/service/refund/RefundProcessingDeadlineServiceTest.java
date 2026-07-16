package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefundProcessingDeadlineService")
class RefundProcessingDeadlineServiceTest {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private RefundProcessingDeadlineService service;

    @BeforeEach
    void setUp() {
        service = new RefundProcessingDeadlineService(systemConfigRepositoryPort);
        when(systemConfigRepositoryPort.findActiveByConfigKey("INVALID_INFO_EXPIRED_DAYS"))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("7").build()));
    }

    @Test
    @DisplayName("computeDeadline adds configured days to createdAt")
    void computeDeadline_usesConfigDays() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 6, 1, 10, 0);
        assertThat(service.computeDeadline(createdAt)).isEqualTo(createdAt.plusDays(7));
    }

    @Test
    @DisplayName("evaluate returns ON_TIME when plenty of time remains")
    void evaluate_onTime() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.READY_TO_PAY)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        var evaluation = service.evaluate(refund);
        assertThat(evaluation.processingUrgency()).isEqualTo(RefundProcessingUrgency.ON_TIME);
        assertThat(evaluation.remainingProcessingSeconds()).isPositive();
    }

    @Test
    @DisplayName("evaluate: deadline equals refundRequest.createdAt plus configured days")
    void evaluate_deadlineFromRefundCreatedAt() {
        LocalDateTime createdAt = LocalDateTime.now().minusDays(1);
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.READY_TO_PAY)
                .createdAt(createdAt)
                .build();

        var evaluation = service.evaluate(refund);

        assertThat(evaluation.processingDeadlineAt()).isEqualTo(createdAt.plusDays(7));
        assertThat(evaluation.processingUrgency()).isEqualTo(RefundProcessingUrgency.ON_TIME);
    }

    @Test
    @DisplayName("getProcessingExpiryDays: falls back to enum default when config missing")
    void getProcessingExpiryDays_fallsBackToDefault() {
        when(systemConfigRepositoryPort.findActiveByConfigKey("INVALID_INFO_EXPIRED_DAYS"))
                .thenReturn(Optional.empty());

        assertThat(service.getProcessingExpiryDays()).isEqualTo(7);
    }

    @Test
    @DisplayName("evaluate returns NOT_APPLICABLE for terminal statuses")
    void evaluate_notApplicableForPaid() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .status(RefundRequestStatus.PAID)
                .createdAt(LocalDateTime.now().minusDays(30))
                .build();

        assertThat(service.evaluate(refund).processingUrgency())
                .isEqualTo(RefundProcessingUrgency.NOT_APPLICABLE);
    }
}
