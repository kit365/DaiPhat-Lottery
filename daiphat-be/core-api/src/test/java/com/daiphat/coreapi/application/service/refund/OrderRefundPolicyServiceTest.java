package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderRefundPolicyService")
class OrderRefundPolicyServiceTest {

    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final OrderRefundProperties orderRefundProperties = new OrderRefundProperties();

    private OrderRefundPolicyService policyService;

    @BeforeEach
    void setUp() {
        policyService = new OrderRefundPolicyService(
                systemConfigRepositoryPort,
                refundRequestRepositoryPort,
                orderRefundProperties);

        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.MAX_REFUND_REQUESTS_PER_DAY.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("3").build()));
    }

    @Test
    @DisplayName("evaluate: allows when under daily limit")
    void evaluate_allowsWhenWithinLimits() {
        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .createdAt(LocalDateTime.now().minusDays(2))
                .build();

        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(eq(customerId), eq(startOfToday())))
                .thenReturn(1L);

        var evaluation = policyService.evaluate(order, customerId);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.maxRefundRequestsPerDay()).isEqualTo(3);
        assertThat(evaluation.refundRequestsSubmittedToday()).isEqualTo(1L);
        assertThat(evaluation.dailyLimitReached()).isFalse();
    }

    @Test
    @DisplayName("evaluate: rejects when daily limit exceeded")
    void evaluate_rejectsDailyLimit() {
        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(eq(customerId), eq(startOfToday())))
                .thenReturn(3L);

        var evaluation = policyService.evaluate(order, customerId);

        assertThat(evaluation.eligible()).isFalse();
        assertThat(evaluation.dailyLimitReached()).isTrue();
        assertThat(evaluation.reason()).isEqualTo(OrderRefundPolicyService.DAILY_LIMIT_REASON);
    }

    @Test
    @DisplayName("evaluate: allows old orders when under daily limit (no allowed-days restriction)")
    void evaluate_allowsOldOrdersWhenUnderDailyLimit() {
        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .createdAt(LocalDateTime.now().minusDays(30))
                .build();

        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(eq(customerId), eq(startOfToday())))
                .thenReturn(0L);

        var evaluation = policyService.evaluate(order, customerId);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.dailyLimitReached()).isFalse();
    }

    @Test
    @DisplayName("ensureWithinPolicy: throws REFUND_DAILY_LIMIT_EXCEEDED")
    void ensureWithinPolicy_throwsDailyLimit() {
        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(eq(customerId), eq(startOfToday())))
                .thenReturn(5L);

        assertThatThrownBy(() -> policyService.ensureWithinPolicy(order, customerId))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_DAILY_LIMIT_EXCEEDED);
    }

    @Test
    @DisplayName("evaluate: uses System_Config MAX_REFUND_REQUESTS_PER_DAY value")
    void evaluate_readsConfiguredDailyLimit() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(SystemConfigEnum.MAX_REFUND_REQUESTS_PER_DAY.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("5").build()));

        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(eq(customerId), eq(startOfToday())))
                .thenReturn(4L);

        var evaluation = policyService.evaluate(order, customerId);

        assertThat(evaluation.eligible()).isTrue();
        assertThat(evaluation.maxRefundRequestsPerDay()).isEqualTo(5);
        assertThat(evaluation.refundRequestsSubmittedToday()).isEqualTo(4L);
        assertThat(evaluation.dailyLimitReached()).isFalse();
    }

    @Test
    @DisplayName("countSubmittedToday: queries from 00:00 of current day (auto-resets at midnight)")
    void countSubmittedToday_usesStartOfDay() {
        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        when(refundRequestRepositoryPort.countByRequestedByAndCreatedAtFrom(eq(customerId), eq(startOfToday())))
                .thenReturn(0L);

        policyService.evaluate(order, customerId);

        ArgumentCaptor<LocalDateTime> fromCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(refundRequestRepositoryPort).countByRequestedByAndCreatedAtFrom(eq(customerId), fromCaptor.capture());
        assertThat(fromCaptor.getValue()).isEqualTo(startOfToday());
        assertThat(fromCaptor.getValue().toLocalTime()).isEqualTo(java.time.LocalTime.MIDNIGHT);
    }

    private LocalDateTime startOfToday() {
        return LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).atStartOfDay();
    }
}
