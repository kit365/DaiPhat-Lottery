package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.config.OrderRefundProperties;
import com.daiphat.coreapi.application.dto.request.refund.CreateOrderRefundRequest;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderRefundService")
class OrderRefundServiceTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort = mock(UserBankAccountRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final RefundApplicationMapper refundApplicationMapper = mock(RefundApplicationMapper.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);

    private OrderRefundProperties orderRefundProperties;
    private OrderRefundService orderRefundService;

    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        orderRefundProperties = new OrderRefundProperties();
        orderRefundProperties.setClosingTime(LocalTime.of(23, 59));
        orderRefundProperties.setWindowMinutes(30);
        orderRefundProperties.setTimezone("Asia/Ho_Chi_Minh");

        orderRefundService = new OrderRefundService(
                orderRepositoryPort,
                refundRequestRepositoryPort,
                userBankAccountRepositoryPort,
                lotteryTicketServicePort,
                refundApplicationMapper,
                orderRefundProperties,
                eventPublisher);
    }

    @Test
    @DisplayName("refundPaidOrder: rejects when order is not PAID")
    void refundPaidOrder_rejectsNonPaidOrder() {
        OrderModel order = paidOrderBuilder().status(OrderStatus.PREPARING).build();
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 1L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ORDER_NOT_PAID);
    }

    @Test
    @DisplayName("refundPaidOrder: rejects when refund window expired")
    void refundPaidOrder_rejectsExpiredWindow() {
        OrderModel order = paidOrderBuilder()
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(31))
                        .amount(BigDecimal.valueOf(20000))
                        .build()))
                .build();
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);

        assertThatThrownBy(() -> orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("reason", 1L)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_WINDOW_EXPIRED);
    }

    @Test
    @DisplayName("refundPaidOrder: cancels order, creates READY_TO_PAY refund, releases tickets")
    void refundPaidOrder_success() {
        OrderModel order = paidOrderBuilder().build();
        UserBankAccountModel bankAccount = UserBankAccountModel.builder().id(5L).userId(customerId).build();
        RefundRequestModel savedRefund = RefundRequestModel.builder()
                .id(99L)
                .status(RefundRequestStatus.READY_TO_PAY)
                .build();

        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);
        when(userBankAccountRepositoryPort.findByIdAndUserId(5L, customerId)).thenReturn(Optional.of(bankAccount));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenReturn(savedRefund);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundApplicationMapper.toRefundResponse(savedRefund, bankAccount)).thenReturn(null);

        orderRefundService.refundPaidOrder(
                orderId, customerId, new CreateOrderRefundRequest("Đổi ý", 5L));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.READY_TO_PAY);

        ArgumentCaptor<OrderModel> orderCaptor = ArgumentCaptor.forClass(OrderModel.class);
        verify(orderRepositoryPort).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getStatus()).isEqualTo(OrderStatus.CANCELLED);

        verify(lotteryTicketServicePort).returnSoldTicketForOrder(11L);
        verify(eventPublisher).publishEvent(any(OrderStatusChangedEvent.class));
    }

    @Test
    @DisplayName("getRefundEligibility: returns eligible with remaining seconds")
    void getRefundEligibility_eligible() {
        OrderModel order = paidOrderBuilder().build();
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsActiveByOrderId(orderId)).thenReturn(false);

        var response = orderRefundService.getRefundEligibility(orderId, customerId);

        assertThat(response.eligible()).isTrue();
        assertThat(response.remainingSeconds()).isNotNull();
    }

    private OrderModel.OrderModelBuilder paidOrderBuilder() {
        return OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("ORD-001")
                .status(OrderStatus.PAID)
                .totalAmount(BigDecimal.valueOf(20000))
                .orderDetails(List.of(OrderDetailModel.builder()
                        .id(1L)
                        .lotteryTicketSerialId(11L)
                        .price(BigDecimal.valueOf(20000))
                        .build()))
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(LocalDateTime.now().minusMinutes(5))
                        .amount(BigDecimal.valueOf(20000))
                        .build()));
    }
}
