package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.DirectOrderTransactionRequest;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@DisplayName("OrderService")
class OrderServiceTest {

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final UserLookupServicePort userLookupServicePort = mock(UserLookupServicePort.class);
    private final PaymentCountdownCachePort paymentCountdownCachePort = mock(PaymentCountdownCachePort.class);

    private OrderService orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderService(
                orderRepositoryPort,
                lotteryTicketServicePort,
                userLookupServicePort,
                Mappers.getMapper(OrderApplicationMapper.class),
                paymentCountdownCachePort
        );
    }

    @Test
    @DisplayName("createDirectOrder: cho phep split payment tien mat va chuyen khoan trong cung order")
    void createDirectOrder_supportsSplitDirectTransactions() {
        UUID operatorId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                customerId,
                "string",
                "0764349951",
                List.of(101L, 102L),
                null,
                "Thu tai quay",
                List.of(
                        new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(6_000), "Khach dua tien mat"),
                        new DirectOrderTransactionRequest(TransactionType.ONLINE, BigDecimal.valueOf(10_000), "Khach chuyen khoan")
                )
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));
        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(101L)).thenReturn(new OrderTicketSnapshot(101L, BigDecimal.valueOf(6_000), LocalDate.now().plusDays(1)));
        when(lotteryTicketServicePort.reserveForOrder(102L)).thenReturn(new OrderTicketSnapshot(102L, BigDecimal.valueOf(10_000), LocalDate.now().plusDays(1)));
        when(orderRepositoryPort.existsByOrderCode(anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createDirectOrder(request, operatorId);

        assertThat(result.getOrderType()).isEqualTo(OrderType.DIRECT);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(result.getTransactions()).hasSize(2);
        assertThat(result.getTransactions())
                .extracting(transaction -> transaction.getType().name())
                .containsExactly("OFFLINE", "ONLINE");
        assertThat(result.getTransactions().get(0).getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(result.getTransactions().get(1).getStatus()).isEqualTo(TransactionStatus.PENDING);
        assertThat(result.getTransactions().get(0).getCodCollectedBy()).isEqualTo(operatorId);
        assertThat(result.getTransactions().get(1).getCodCollectedBy()).isNull();
        assertThat(result.getTransactions().stream()
                .map(TransactionModel::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo("16000");
        verify(lotteryTicketServicePort).reserveForOrder(101L);
        verify(lotteryTicketServicePort).reserveForOrder(102L);
    }

    @Test
    @DisplayName("createDirectOrder: tong split payment phai khop tong don")
    void createDirectOrder_rejectsInvalidSplitAmount() {
        UUID operatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "string",
                "0764349951",
                List.of(101L, 102L),
                null,
                "Thu tai quay",
                List.of(
                        new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(5_000), null),
                        new DirectOrderTransactionRequest(TransactionType.ONLINE, BigDecimal.valueOf(10_000), null)
                )
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(101L)).thenReturn(new OrderTicketSnapshot(101L, BigDecimal.valueOf(6_000), LocalDate.now().plusDays(1)));
        when(lotteryTicketServicePort.reserveForOrder(102L)).thenReturn(new OrderTicketSnapshot(102L, BigDecimal.valueOf(6_000), LocalDate.now().plusDays(1)));

        assertThatThrownBy(() -> orderService.createDirectOrder(request, operatorId))
                .isInstanceOf(DomainException.class)
                .hasMessage("Số tiền thanh toán không hợp lệ.");
    }

    @Test
    @DisplayName("createOnlineOrder: thoi gian hen lay ve khong duoc som hon 3 ngay truoc ngay quay")
    void createOnlineOrder_rejectsPickupTimeTooFarFromDrawDate() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(10);
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                "Kiet",
                "0764349959",
                List.of(101L),
                null,
                drawDate.minusDays(4).atTime(10, 0),
                "string"
        );

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(101L))
                .thenReturn(new OrderTicketSnapshot(101L, BigDecimal.valueOf(10_000), drawDate));

        assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .hasMessage("Thời gian hẹn lấy vé không hợp lệ.");
        verify(orderRepositoryPort, never()).save(any(OrderModel.class));
    }

    @Test
    @DisplayName("createOnlineOrder: cho phep thoi gian hen lay ve nam trong 3 ngay truoc ngay quay")
    void createOnlineOrder_acceptsPickupTimeWithinDrawDateWindow() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(5);
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                "Kiet",
                "0764349959",
                List.of(101L),
                null,
                LocalDateTime.of(drawDate.minusDays(2), java.time.LocalTime.of(9, 0)),
                "string"
        );

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(101L))
                .thenReturn(new OrderTicketSnapshot(101L, BigDecimal.valueOf(10_000), drawDate));
        when(orderRepositoryPort.existsByOrderCode(anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createOnlineOrder(request, customerId);

        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(result.getExpectedPickupAt()).isEqualTo(request.expectedPickupAt());
    }
}
