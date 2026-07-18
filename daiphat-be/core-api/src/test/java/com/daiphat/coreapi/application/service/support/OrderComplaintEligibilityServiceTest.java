package com.daiphat.coreapi.application.service.support;

import com.daiphat.coreapi.application.dto.response.support.OrderComplaintEligibilityResponse;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
import com.daiphat.coreapi.domain.model.support.TicketCategoryModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderComplaintEligibilityService")
class OrderComplaintEligibilityServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_CUSTOMER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ORDER_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final ZoneId ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);
    private final SystemConfigRepositoryPort systemConfigRepositoryPort = mock(SystemConfigRepositoryPort.class);
    private OrderComplaintEligibilityService service;

    @BeforeEach
    void setUp() {
        service = new OrderComplaintEligibilityService(
                orderRepositoryPort, transactionRepositoryPort, systemConfigRepositoryPort);
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(
                        SystemConfigEnum.ORDER_STATUS_DELAY_COMPLAINT_MINUTES.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("15").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(
                        SystemConfigEnum.ORDER_COMPLAINT_DRAW_CUTOFF_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("15:00").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(
                        SystemConfigEnum.ORDER_SERVICE_COMPLAINT_WINDOW_HOURS.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("24").build()));
        lenient().when(systemConfigRepositoryPort.findActiveByConfigKey(
                        SystemConfigEnum.ORDER_CANCELLED_COMPLAINT_WINDOW_HOURS.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("24").build()));
    }

    @Test
    void paymentTimeoutCancelled_isEligibleWithEvidenceRequired() {
        OrderModel order = order(OrderStatus.CANCELLED);
        order.setCancelType(OrderCancelType.SYSTEM_PAYMENT_TIMEOUT);
        when(orderRepositoryPort.findById(ORDER_ID)).thenReturn(Optional.of(order));

        OrderComplaintEligibilityResponse result = service.evaluate(ORDER_ID, CUSTOMER_ID);

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_PAYMENT_SYNC_ERROR);
        assertThat(result.requiresEvidence()).isTrue();
    }

    @Test
    void preparationDelay_tooEarlyWhenStatusChangedRecently() {
        LocalDateTime now = LocalDate.now(ZONE_ID).atTime(10, 0);
        OrderModel order = order(OrderStatus.PAID);
        order.setUpdatedAt(now.minusMinutes(10));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isFalse();
        assertThat(result.reasonCode()).isEqualTo(OrderComplaintEligibilityService.REASON_TOO_EARLY);
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_PREPARATION_DELAY);
        assertThat(result.remainingSeconds()).isGreaterThan(0);
    }

    @Test
    void preparationDelay_eligibleWhenStatusUnchangedPastDelay() {
        LocalDateTime now = LocalDate.now(ZONE_ID).atTime(10, 0);
        OrderModel order = order(OrderStatus.PREPARING);
        order.setUpdatedAt(now.minusMinutes(16));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_PREPARATION_DELAY);
    }

    @Test
    void preparationDelay_fallsBackToPaymentTimeWhenNoUpdatedAt() {
        LocalDateTime now = LocalDate.now(ZONE_ID).atTime(10, 0);
        OrderModel order = order(OrderStatus.PAID);
        order.setTransactions(List.of(completedTx(now.minusMinutes(20))));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_PREPARATION_DELAY);
    }

    @Test
    void preparationDelay_eligibleImmediatelyAfterDrawCutoff() {
        LocalDateTime now = LocalDate.now(ZONE_ID).atTime(15, 0);
        OrderModel order = order(OrderStatus.PAID);
        order.setTransactions(List.of(completedTx(now.minusMinutes(5))));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_PREPARATION_DELAY);
    }

    @Test
    void outOfStockCancelled_eligibleWithinWindow() {
        LocalDateTime now = LocalDateTime.now(ZONE_ID);
        OrderModel order = order(OrderStatus.CANCELLED);
        order.setCancelType(OrderCancelType.OUT_OF_STOCK_INCIDENT);
        order.setCancelledAt(now.minusHours(23));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode())
                .isEqualTo(OrderComplaintEligibilityService.CATEGORY_CANCELLED_OUT_OF_STOCK);
        assertThat(result.requiresEvidence()).isFalse();
        assertThat(result.remainingSeconds()).isGreaterThan(0);
    }

    @Test
    void outOfStockCancelled_expiredAfterWindow() {
        LocalDateTime now = LocalDateTime.now(ZONE_ID);
        OrderModel order = order(OrderStatus.CANCELLED);
        order.setCancelType(OrderCancelType.OUT_OF_STOCK_INCIDENT);
        order.setCancelledAt(now.minusHours(25));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isFalse();
        assertThat(result.reasonCode()).isEqualTo(OrderComplaintEligibilityService.REASON_WINDOW_EXPIRED);
        assertThat(result.categoryCode())
                .isEqualTo(OrderComplaintEligibilityService.CATEGORY_CANCELLED_OUT_OF_STOCK);
    }

    @Test
    void otherCancelTypes_areNotEligible() {
        LocalDateTime now = LocalDateTime.now(ZONE_ID);
        OrderModel order = order(OrderStatus.CANCELLED);
        order.setCancelType(OrderCancelType.CUSTOMER_REQUEST);
        order.setCancelledAt(now.minusHours(1));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isFalse();
        assertThat(result.reasonCode()).isEqualTo(OrderComplaintEligibilityService.REASON_STATUS_INVALID);
    }

    @Test
    void pendingPickup_eligibleImmediately() {
        OrderModel order = order(OrderStatus.PENDING_PICKUP);
        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, LocalDateTime.now(ZONE_ID));

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_PICKUP_ISSUE);
    }

    @Test
    void serviceQuality_within24Hours_eligible() {
        LocalDateTime now = LocalDateTime.now(ZONE_ID);
        OrderModel order = order(OrderStatus.COMPLETED);
        order.setActualPickedUpAt(now.minusHours(23));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isTrue();
        assertThat(result.categoryCode()).isEqualTo(OrderComplaintEligibilityService.CATEGORY_SERVICE_QUALITY);
    }

    @Test
    void serviceQuality_after24Hours_expired() {
        LocalDateTime now = LocalDateTime.now(ZONE_ID);
        OrderModel order = order(OrderStatus.COMPLETED);
        order.setActualPickedUpAt(now.minusHours(25));

        OrderComplaintEligibilityResponse result = service.evaluateOrder(order, now);

        assertThat(result.eligible()).isFalse();
        assertThat(result.reasonCode()).isEqualTo(OrderComplaintEligibilityService.REASON_WINDOW_EXPIRED);
    }

    @Test
    void validate_rejectsCategoryMismatch() {
        OrderModel order = order(OrderStatus.PENDING_PICKUP);
        when(orderRepositoryPort.findById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.validate(category(OrderComplaintEligibilityService.CATEGORY_SERVICE_QUALITY),
                ORDER_ID.toString(), CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_ORDER_COMPLAINT_CATEGORY_MISMATCH);
    }

    @Test
    void validate_rejectsWrongOwner() {
        OrderModel order = order(OrderStatus.PENDING_PICKUP);
        when(orderRepositoryPort.findById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.validate(category(OrderComplaintEligibilityService.CATEGORY_PICKUP_ISSUE),
                ORDER_ID.toString(), OTHER_CUSTOMER_ID))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.TICKET_REF_ORDER_MISMATCH);
    }

    @Test
    void validate_acceptsMatchingEligibleCategory() {
        OrderModel order = order(OrderStatus.PENDING_PICKUP);
        when(orderRepositoryPort.findById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatCode(() -> service.validate(category(OrderComplaintEligibilityService.CATEGORY_PICKUP_ISSUE),
                ORDER_ID.toString(), CUSTOMER_ID))
                .doesNotThrowAnyException();
    }

    @Test
    void getDrawCutoffTime_fallsBackOnInvalidConfig() {
        when(systemConfigRepositoryPort.findActiveByConfigKey(
                SystemConfigEnum.ORDER_COMPLAINT_DRAW_CUTOFF_TIME.name()))
                .thenReturn(Optional.of(SystemConfigModel.builder().configValue("invalid").build()));

        assertThat(service.getDrawCutoffTime()).isEqualTo(LocalTime.of(15, 0));
    }

    private OrderModel order(OrderStatus status) {
        return OrderModel.builder()
                .id(ORDER_ID)
                .userId(CUSTOMER_ID)
                .status(status)
                .build();
    }

    private TransactionModel completedTx(LocalDateTime paidAt) {
        return TransactionModel.builder()
                .status(TransactionStatus.COMPLETED)
                .paidAt(paidAt)
                .build();
    }

    private TicketCategoryModel category(String code) {
        return TicketCategoryModel.builder()
                .id(1L)
                .code(code)
                .requiredRefType(TicketRefType.ORDER)
                .build();
    }
}
