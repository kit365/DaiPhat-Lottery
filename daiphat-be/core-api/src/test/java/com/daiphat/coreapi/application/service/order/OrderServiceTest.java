package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.DirectOrderTransactionRequest;
import com.daiphat.coreapi.application.dto.request.order.OrderTicketItemRequest;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategyFactory;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import static org.mockito.ArgumentMatchers.eq;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
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

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-267] OrderService")
class OrderServiceTest {

private static final String DEFAULT_CUSTOMER_NAME = "Kiet";
    private static final String DEFAULT_PHONE = "0912345678";
    private static final String DEFAULT_EMAIL = "test@gmail.com";
    private static final String DEFAULT_NOTE = "Ghi chú";

    private static final List<Long> TICKET_IDS = List.of(101L, 102L);
    private static final List<OrderTicketItemRequest> TICKET_ITEMS = List.of(
            new OrderTicketItemRequest(101L, 1),
            new OrderTicketItemRequest(102L, 1)
    );
    private static final List<OrderTicketItemRequest> SINGLE_TICKET_ITEM = List.of(
            new OrderTicketItemRequest(101L, 1)
    );

    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort = mock(LotteryTicketSerialServicePort.class);
    private final UserLookupServicePort userLookupServicePort = mock(UserLookupServicePort.class);
    private final PaymentCountdownCachePort paymentCountdownCachePort = mock(PaymentCountdownCachePort.class);
    private final PaymentGatewayStrategyFactory paymentGatewayStrategyFactory = mock(PaymentGatewayStrategyFactory.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final OrderRefundGraceService orderRefundGraceService = mock(OrderRefundGraceService.class);

    private OrderServicePort orderService;

    private CreateOnlineOrderRequest createOnlineRequest(List<OrderTicketItemRequest> tickets, LocalDateTime pickupTime, String phone) {
        return new CreateOnlineOrderRequest(DEFAULT_CUSTOMER_NAME, phone, null, tickets, null, pickupTime, DEFAULT_NOTE);
    }

    private CreateDirectOrderRequest createDirectRequest(List<OrderTicketItemRequest> tickets, String phone, String email, List<DirectOrderTransactionRequest> payments) {
        return new CreateDirectOrderRequest(null, DEFAULT_CUSTOMER_NAME, phone, email, tickets, null, DEFAULT_NOTE, payments);
    }

    @BeforeEach
    void setUp() {
        orderService = new OrderService(
                orderRepositoryPort,
                lotteryTicketServicePort,
                lotteryTicketSerialServicePort,
                userLookupServicePort,
                Mappers.getMapper(OrderApplicationMapper.class),
                paymentCountdownCachePort,
                paymentGatewayStrategyFactory,
                eventPublisher,
                orderRefundGraceService
        );
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thành công với thông tin hợp lệ")
    void createOnlineOrder_success() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(2);
        UserModel customer = new UserModel();
        customer.setId(customerId);
        customer.setEmail(DEFAULT_EMAIL);

        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                DEFAULT_CUSTOMER_NAME,
                DEFAULT_PHONE,
                null,
                SINGLE_TICKET_ITEM,
                null,
                LocalDateTime.of(drawDate.minusDays(1), java.time.LocalTime.of(9, 0)),
                DEFAULT_NOTE
        );

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(customer);
        when(lotteryTicketServicePort.reserveForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), drawDate)));
        when(orderRepositoryPort.existsByOrderCode(anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createOnlineOrder(request, customerId);

        assertThat(result).isNotNull();
        assertThat(result.getOrderType()).isEqualTo(OrderType.ONLINE);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(result.getUserId()).isEqualTo(customerId);
        assertThat(result.getTotalAmount()).isEqualByComparingTo("10000");
        assertThat(result.getTransactions()).hasSize(1);
        verify(orderRepositoryPort).save(any(OrderModel.class));
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi danh sách vé trống")
    void createOnlineOrder_emptyTickets_throwsException() {
        UUID customerId = UUID.randomUUID();
        CreateOnlineOrderRequest request = createOnlineRequest(Collections.emptyList(), LocalDateTime.now().plusDays(1), DEFAULT_PHONE);

        assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(orderRepositoryPort, never()).save(any(OrderModel.class));
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại do thời gian hẹn lấy vé quá xa ngày quay")
    void createOnlineOrder_rejectsPickupTimeTooFarFromDrawDate() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(10);
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                DEFAULT_CUSTOMER_NAME,
                DEFAULT_PHONE,
                null,
                SINGLE_TICKET_ITEM,
                null,
                drawDate.minusDays(4).atTime(10, 0),
                "string"
        );

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), drawDate)));

        assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .hasMessage("Thời gian hẹn lấy vé không hợp lệ.");
        verify(orderRepositoryPort, never()).save(any(OrderModel.class));
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thành công do thời gian lấy vé hợp lệ trong vòng 3 ngày trước ngày quay")
    void createOnlineOrder_acceptsPickupTimeWithinDrawDateWindow() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(5);
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                DEFAULT_CUSTOMER_NAME,
                DEFAULT_PHONE,
                "test@example.com",
                SINGLE_TICKET_ITEM,
                null,
                LocalDateTime.of(drawDate.minusDays(2), java.time.LocalTime.of(9, 0)),
                "string"
        );

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), drawDate)));
        when(orderRepositoryPort.existsByOrderCode(anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createOnlineOrder(request, customerId);

        assertThat(result.getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        assertThat(result.getExpectedPickupAt()).isEqualTo(request.expectedPickupAt());
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thành công với 1 khoản thanh toán")
    void createDirectOrder_success_singlePayment() {
        UUID operatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "Khach Le",
                "0764349951",
                null,
                SINGLE_TICKET_ITEM,
                null,
                "Thu tai quay",
                List.of(
                        new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(10_000), "Tien mat")
                )
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.sellOfflineForOrder(List.of(101L))).thenReturn(List.of(
                new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), LocalDate.now().plusDays(1))
        ));
        when(orderRepositoryPort.existsByOrderCode(anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createDirectOrder(request, operatorId);

        assertThat(result.getOrderType()).isEqualTo(OrderType.DIRECT);
        assertThat(result.getStatus()).isEqualTo(OrderStatus.COMPLETED); // Fully paid -> mark paid -> complete
        assertThat(result.getTransactions()).hasSize(1);
        assertThat(result.getTransactions().getFirst().getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        verify(orderRepositoryPort).save(any(OrderModel.class));
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi không có số điện thoại hoặc email")
    void createDirectOrder_withoutContactInfo_throwsException() {
        UUID operatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "Khach Le",
                null,
                null,
                SINGLE_TICKET_ITEM,
                null,
                "Thu tai quay",
                List.of(new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(10_000), "Tien mat"))
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));

        assertThatThrownBy(() -> orderService.createDirectOrder(request, operatorId))
                .isInstanceOf(DomainException.class)
                .hasMessage("Dữ liệu nhập vào không hợp lệ.")
                .hasFieldOrPropertyWithValue("internalMessage", "Phải nhập ít nhất số điện thoại hoặc email.");
                
        verify(orderRepositoryPort, never()).save(any(OrderModel.class));
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thành công với thanh toán tách khoản (tiền mặt và chuyển khoản)")
    void createDirectOrder_supportsSplitDirectTransactions() {
        UUID operatorId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                customerId,
                "string",
                "0764349951",
                null,
                TICKET_ITEMS,
                null,
                "Thu tai quay",
                List.of(
                        new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(6_000), "Khach dua tien mat"),
                        new DirectOrderTransactionRequest(TransactionType.ONLINE, BigDecimal.valueOf(10_000), "Khach chuyen khoan")
                )
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));
        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(TICKET_IDS)).thenReturn(List.of(
                new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(6_000), LocalDate.now().plusDays(1)),
                new OrderTicketSnapshot(102L, 1002L, BigDecimal.valueOf(10_000), LocalDate.now().plusDays(1))
        ));
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
        verify(lotteryTicketServicePort).reserveForOrder(TICKET_IDS);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi tổng số tiền tách khoản không khớp")
    void createDirectOrder_rejectsInvalidSplitAmount() {
        UUID operatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "string",
                "0764349951",
                null,
                TICKET_ITEMS,
                null,
                "Thu tai quay",
                List.of(
                        new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(5_000), null),
                        new DirectOrderTransactionRequest(TransactionType.ONLINE, BigDecimal.valueOf(10_000), null)
                )
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));
        when(lotteryTicketServicePort.reserveForOrder(TICKET_IDS)).thenReturn(List.of(
                new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(6_000), LocalDate.now().plusDays(1)),
                new OrderTicketSnapshot(102L, 1002L, BigDecimal.valueOf(6_000), LocalDate.now().plusDays(1))
        ));

        assertThatThrownBy(() -> orderService.createDirectOrder(request, operatorId))
                .isInstanceOf(DomainException.class)
                .hasMessage("Số tiền thanh toán không hợp lệ.");
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi số điện thoại không hợp lệ")
    void createOnlineOrder_invalidPhone_throwsException() {
        UUID customerId = UUID.randomUUID();
        CreateOnlineOrderRequest request = createOnlineRequest(SINGLE_TICKET_ITEM, LocalDateTime.now().plusDays(1), "invalid-phone");

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));

        assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PHONE_INVALID);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi thời gian hẹn lấy vé ở quá khứ")
    void createOnlineOrder_pickupTimeInThePast_throwsException() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(2);
        CreateOnlineOrderRequest request = createOnlineRequest(SINGLE_TICKET_ITEM, LocalDateTime.now().minusDays(1), DEFAULT_PHONE);

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(mock(UserModel.class));

        assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .hasMessage("Thời gian hẹn lấy vé không hợp lệ.");
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi customerId không tồn tại")
    void createDirectOrder_withNonExistentCustomer_throwsException() {
        UUID operatorId = UUID.randomUUID();
        UUID invalidCustomerId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                invalidCustomerId,
                "Khach Le",
                "0764349951",
                null,
                SINGLE_TICKET_ITEM,
                null,
                "Thu tai quay",
                List.of(new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(10_000), "Tien mat"))
        );

        when(userLookupServicePort.findByIdOrThrow(invalidCustomerId)).thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> orderService.createDirectOrder(request, operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi danh sách vé trống")
    void createDirectOrder_emptyTickets_throwsException() {
        UUID operatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "Khach Le",
                "0764349951",
                null,
                Collections.emptyList(),
                null,
                "Thu tai quay",
                List.of(new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(10_000), "Tien mat"))
        );

        assertThatThrownBy(() -> orderService.createDirectOrder(request, operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi nhân viên tạo đơn không tồn tại")
    void createDirectOrder_withNonExistentOperator_throwsException() {
        UUID invalidOperatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "Khach Le",
                "0764349951",
                null,
                SINGLE_TICKET_ITEM,
                null,
                "Thu tai quay",
                List.of(new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(10_000), "Tien mat"))
        );

        when(userLookupServicePort.findByIdOrThrow(invalidOperatorId)).thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> orderService.createDirectOrder(request, invalidOperatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi số điện thoại không hợp lệ dù đã có email")
    void createDirectOrder_invalidPhoneWithEmail_throwsException() {
        UUID operatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = new CreateDirectOrderRequest(
                null,
                "Khach Le",
                "invalid-phone",
                "test@example.com",
                SINGLE_TICKET_ITEM,
                null,
                "Thu tai quay",
                List.of(new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.valueOf(10_000), "Tien mat"))
        );

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(mock(UserModel.class));

        assertThatThrownBy(() -> orderService.createDirectOrder(request, operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PHONE_INVALID);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi expectedPickupAt là null")
    void createOnlineOrder_nullPickupTime_throwsException() {
        CreateOnlineOrderRequest request = createOnlineRequest(SINGLE_TICKET_ITEM, (LocalDateTime) null, DEFAULT_PHONE);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOnlineOrder(request, UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_PICKUP_TIME);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi có vé không có drawDate")
    void createOnlineOrder_nullDrawDate_throwsException() {
        UUID customerId = UUID.randomUUID();
        CreateOnlineOrderRequest request = createOnlineRequest(SINGLE_TICKET_ITEM, LocalDateTime.now().plusDays(1), DEFAULT_PHONE);

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());
        // Return ticket snapshot with null drawDate
        when(lotteryTicketServicePort.reserveForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), null)));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_PICKUP_TIME);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi pickupDate sau earliestDrawDate")
    void createOnlineOrder_pickupDateAfterDrawDate_throwsException() {
        UUID customerId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(2);
        // Pickup date is 3 days after now, which is after drawDate
        CreateOnlineOrderRequest request = createOnlineRequest(SINGLE_TICKET_ITEM, LocalDateTime.now().plusDays(3), DEFAULT_PHONE);

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());
        when(lotteryTicketServicePort.reserveForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), drawDate)));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOnlineOrder(request, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_PICKUP_TIME);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thành công khi thiếu phone nhưng có email")
    void createDirectOrder_missingPhoneButHasEmail_success() {
        UUID creatorId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(2);
        CreateDirectOrderRequest request = createDirectRequest(SINGLE_TICKET_ITEM, null, DEFAULT_EMAIL, null);

        when(userLookupServicePort.findByIdOrThrow(creatorId)).thenReturn(new UserModel());
        when(lotteryTicketServicePort.sellOfflineForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), drawDate)));
        when(orderRepositoryPort.existsByOrderCode(org.mockito.ArgumentMatchers.anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createDirectOrder(request, creatorId);

        assertThat(result.getEmail()).isEqualTo(DEFAULT_EMAIL);
        assertThat(result.getPhone()).isNull();
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi chọn quá 10 vé")
    void createOnlineOrder_tooManyTickets_throwsException() {
        List<OrderTicketItemRequest> manyTickets = new java.util.ArrayList<>();
        for (long i = 1; i <= 11; i++) {
            manyTickets.add(new OrderTicketItemRequest(i, 1));
        }
        CreateOnlineOrderRequest request = createOnlineRequest(manyTickets, LocalDateTime.now().plusDays(1), DEFAULT_PHONE);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOnlineOrder(request, UUID.randomUUID()))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi không có sđt và email")
    void createDirectOrder_noPhoneNoEmail_throwsException() {
        UUID creatorId = UUID.randomUUID();
        CreateDirectOrderRequest request = createDirectRequest(SINGLE_TICKET_ITEM, null, null, null);

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createDirectOrder(request, creatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp thất bại khi transaction amount bằng 0")
    void createDirectOrder_zeroTransactionAmount_throwsException() {
        UUID creatorId = UUID.randomUUID();
        List<DirectOrderTransactionRequest> payments = List.of(
                new DirectOrderTransactionRequest(TransactionType.OFFLINE, BigDecimal.ZERO, "Ghi chú")
        );
        CreateDirectOrderRequest request = createDirectRequest(SINGLE_TICKET_ITEM, DEFAULT_PHONE, DEFAULT_EMAIL, payments);

        when(userLookupServicePort.findByIdOrThrow(creatorId)).thenReturn(new UserModel());
        when(lotteryTicketServicePort.sellOfflineForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), LocalDate.now().plusDays(2))));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createDirectOrder(request, creatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_TRANSACTION_AMOUNT);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn trực tiếp có payment ONLINE sẽ gọi reserveForOrder")
    void createDirectOrder_withOnlinePayment_success() {
        UUID creatorId = UUID.randomUUID();
        LocalDate drawDate = LocalDate.now().plusDays(2);
        List<DirectOrderTransactionRequest> payments = List.of(
                new DirectOrderTransactionRequest(TransactionType.ONLINE, BigDecimal.valueOf(10_000), "Ghi chú")
        );
        CreateDirectOrderRequest request = createDirectRequest(SINGLE_TICKET_ITEM, DEFAULT_PHONE, DEFAULT_EMAIL, payments);

        when(userLookupServicePort.findByIdOrThrow(creatorId)).thenReturn(new UserModel());
        // Do có payment ONLINE nên sẽ gọi reserveForOrder thay vì sellOfflineForOrder
        when(lotteryTicketServicePort.reserveForOrder(List.of(101L)))
                .thenReturn(List.of(new OrderTicketSnapshot(101L, 1001L, BigDecimal.valueOf(10_000), drawDate)));
        when(orderRepositoryPort.existsByOrderCode(org.mockito.ArgumentMatchers.anyString())).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OrderModel result = orderService.createDirectOrder(request, creatorId);

        assertThat(result.getTransactions()).hasSize(1);
        assertThat(result.getTransactions().get(0).getType()).isEqualTo(TransactionType.ONLINE);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi SDT rỗng")
    void createOnlineOrder_blankPhone_throwsException() {
        UUID creatorId = UUID.randomUUID();
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                DEFAULT_CUSTOMER_NAME,
                "  ",
                DEFAULT_EMAIL,
                SINGLE_TICKET_ITEM,
                OrderReceiveType.COUNTER_PICKUP,
                LocalDateTime.now().plusDays(1),
                DEFAULT_NOTE
        );

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOnlineOrder(request, creatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.PHONE_INVALID);
    }

    @Test
    @DisplayName("[DP-346] CREATE: Tạo đơn online thất bại khi ReceiveType không hợp lệ")
    void createOnlineOrder_invalidReceiveType_throwsException() {
        UUID creatorId = UUID.randomUUID();
        CreateOnlineOrderRequest request = new CreateOnlineOrderRequest(
                DEFAULT_CUSTOMER_NAME,
                DEFAULT_PHONE,
                DEFAULT_EMAIL,
                SINGLE_TICKET_ITEM,
                null,
                LocalDateTime.now().plusDays(1),
                DEFAULT_NOTE
        );

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> orderService.createOnlineOrder(request, creatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_PICKUP_TIME);
    }

    @Test
    @DisplayName("[DP-353] getOrders: Lấy danh sách đơn hàng thành công")
    void getOrders_success() {
        Page<OrderModel> mockPage = new PageImpl<>(List.of(new OrderModel()));
        when(orderRepositoryPort.findOrders(
                any(), any(), any(), any(), any(), any(), any()
        )).thenReturn(mockPage);

        PageResponse<OrderResponse> result = orderService.getOrders(
                1, 10, List.of("PENDING_PAYMENT"), null, null, List.of("ONLINE"), List.of("COUNTER_PICKUP"), "search", "createdAt", "DESC"
        );

        assertThat(result).isNotNull();
        assertThat(result.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-353] getOrders: Ném exception khi khoảng thời gian không hợp lệ")
    void getOrders_throwsWhenInvalidDateRange() {
        assertThatThrownBy(() -> orderService.getOrders(
                1, 10, null, LocalDate.now(), LocalDate.now().minusDays(1), null, null, null, null, null
        )).isInstanceOf(DomainException.class)
          .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-486] getMyOrders: Lấy danh sách đơn hàng của tôi thành công")
    void getMyOrders_success() {
        UUID customerId = UUID.randomUUID();
        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());
        
        Page<OrderModel> mockPage = new PageImpl<>(List.of(new OrderModel()));
        when(orderRepositoryPort.findMyOrders(
                any(), eq(customerId), any(), any(), any(), any(), any()
        )).thenReturn(mockPage);

        PageResponse<OrderResponse> result = orderService.getMyOrders(
                1, 10, List.of("PENDING_PAYMENT"), null, null, List.of("ONLINE"), "search", "createdAt", "DESC", customerId
        );

        assertThat(result).isNotNull();
        assertThat(result.getRecordList()).hasSize(1);
    }

    @Test
    @DisplayName("[DP-486] getMyOrders: Ném exception khi user không tồn tại")
    void getMyOrders_throwsWhenUserNotFound() {
        UUID customerId = UUID.randomUUID();
        when(userLookupServicePort.findByIdOrThrow(customerId)).thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> orderService.getMyOrders(
                1, 10, null, null, null, null, null, null, null, customerId
        )).isInstanceOf(DomainException.class)
          .extracting("errorCode").isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-486] getMyOrders: Ném exception khi khoảng thời gian không hợp lệ")
    void getMyOrders_throwsWhenInvalidDateRange() {
        UUID customerId = UUID.randomUUID();
        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());

        assertThatThrownBy(() -> orderService.getMyOrders(
                1, 10, null, LocalDate.now(), LocalDate.now().minusDays(1), null, null, null, null, customerId
        )).isInstanceOf(DomainException.class)
          .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-380] updateOrderStatus: Cập nhật trạng thái thành công")
    void updateOrderStatus_success() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .userId(UUID.randomUUID())
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PENDING_PICKUP)
                .build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenReturn(order);

        OrderResponse result = orderService.updateOrderStatus(orderId, OrderStatus.COMPLETED, "Lý do", operatorId);

        assertThat(result).isNotNull();
        org.mockito.Mockito.verify(orderRepositoryPort).save(order);
        org.mockito.Mockito.verify(eventPublisher).publishEvent(any(com.daiphat.coreapi.application.event.OrderStatusChangedEvent.class));
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    @DisplayName("[DP-380] updateOrderStatus: Ném exception khi operator không tồn tại")
    void updateOrderStatus_throwsWhenOperatorNotFound() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> orderService.updateOrderStatus(orderId, OrderStatus.COMPLETED, "Lý do", operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-380] updateOrderStatus: Ném exception khi status bị null")
    void updateOrderStatus_throwsWhenStatusNull() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());

        assertThatThrownBy(() -> orderService.updateOrderStatus(orderId, null, "Lý do", operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("[DP-380] updateOrderStatus: Trả về order cũ nếu status không đổi")
    void updateOrderStatus_returnsEarlyWhenStatusSame() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .status(OrderStatus.COMPLETED)
                .build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));

        OrderResponse result = orderService.updateOrderStatus(orderId, OrderStatus.COMPLETED, "Lý do", operatorId);

        assertThat(result).isNotNull();
        org.mockito.Mockito.verify(orderRepositoryPort, org.mockito.Mockito.never()).save(any());
    }

    @Test
    @DisplayName("[DP-359] getOrderDetail: Admin lấy chi tiết đơn hàng thành công")
    void getOrderDetail_success() {
        UUID orderId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).build();
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));

        OrderResponse result = orderService.getOrderDetail(orderId);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(orderId);
    }

    @Test
    @DisplayName("[DP-359] getOrderDetail: Ném lỗi khi không tìm thấy đơn hàng")
    void getOrderDetail_throwsWhenNotFound() {
        UUID orderId = UUID.randomUUID();
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> orderService.getOrderDetail(orderId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-356] getMyOrderDetail: Customer lấy chi tiết đơn hàng của mình thành công")
    void getMyOrderDetail_success() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(customerId).build();

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));

        OrderResponse result = orderService.getMyOrderDetail(orderId, customerId);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(orderId);
        assertThat(result.userId()).isEqualTo(customerId);
    }

    @Test
    @DisplayName("[DP-356] getMyOrderDetail: Ném lỗi khi Customer không tồn tại")
    void getMyOrderDetail_throwsWhenCustomerNotFound() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenThrow(new DomainException(ErrorCode.USER_NOT_FOUND));

        assertThatThrownBy(() -> orderService.getMyOrderDetail(orderId, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-356] getMyOrderDetail: Ném lỗi khi đơn hàng không tồn tại")
    void getMyOrderDetail_throwsWhenOrderNotFound() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> orderService.getMyOrderDetail(orderId, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }

    @Test
    @DisplayName("[DP-356] getMyOrderDetail: Ném lỗi khi truy cập đơn hàng của người khác")
    void getMyOrderDetail_throwsWhenAccessDenied() {
        UUID orderId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        UUID otherCustomerId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(otherCustomerId).build();

        when(userLookupServicePort.findByIdOrThrow(customerId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));

        assertThatThrownBy(() -> orderService.getMyOrderDetail(orderId, customerId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("updateOrderStatus: target PAID - Ném lỗi nếu chưa thanh toán đủ")
    void updateOrderStatus_paid_throwsWhenNotFullyPaid() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(UUID.randomUUID()).orderType(OrderType.ONLINE).status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(java.math.BigDecimal.valueOf(100)).transactions(java.util.List.of()).build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(orderId, OrderStatus.PAID, null, operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ORDER_INVALID_STATUS);
    }

    @Test
    @DisplayName("updateOrderStatus: target PAID - Thành công")
    void updateOrderStatus_paid_success() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(UUID.randomUUID()).orderType(OrderType.ONLINE).status(OrderStatus.PENDING_PAYMENT)
                .totalAmount(java.math.BigDecimal.valueOf(100))
                .transactions(java.util.List.of(com.daiphat.coreapi.domain.model.orders.TransactionModel.builder()
                        .status(com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus.COMPLETED)
                        .amount(java.math.BigDecimal.valueOf(100)).build()))
                .build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenReturn(order);

        OrderResponse result = orderService.updateOrderStatus(orderId, OrderStatus.PAID, null, operatorId);

        assertThat(result).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
    }

    @Test
    @DisplayName("updateOrderStatus: target PREPARING - Thành công")
    void updateOrderStatus_preparing_success() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(UUID.randomUUID()).orderType(OrderType.ONLINE).status(OrderStatus.PAID).build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenReturn(order);

        OrderResponse result = orderService.updateOrderStatus(orderId, OrderStatus.PREPARING, null, operatorId);

        assertThat(result).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PREPARING);
    }

    @Test
    @DisplayName("updateOrderStatus: target COMPLETED cho DIRECT order - Thành công")
    void updateOrderStatus_completed_direct_success() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(UUID.randomUUID()).orderType(OrderType.DIRECT).status(OrderStatus.PAID).build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenReturn(order);

        OrderResponse result = orderService.updateOrderStatus(orderId, OrderStatus.COMPLETED, null, operatorId);

        assertThat(result).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
    }

    @Test
    @DisplayName("updateOrderStatus: target CANCELLED - Hủy khi đang Pending Payment")
    void updateOrderStatus_cancelled_pendingPayment() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(UUID.randomUUID()).orderType(OrderType.ONLINE).status(OrderStatus.PENDING_PAYMENT).build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));
        when(orderRepositoryPort.save(any(OrderModel.class))).thenReturn(order);

        OrderResponse result = orderService.updateOrderStatus(orderId, OrderStatus.CANCELLED, null, operatorId);

        assertThat(result).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    @DisplayName("updateOrderStatus: target PENDING_PAYMENT - Ném lỗi invalid status")
    void updateOrderStatus_targetPendingPayment_throws() {
        UUID orderId = UUID.randomUUID();
        UUID operatorId = UUID.randomUUID();
        OrderModel order = OrderModel.builder().id(orderId).userId(UUID.randomUUID()).orderType(OrderType.ONLINE).status(OrderStatus.PAID).build();

        when(userLookupServicePort.findByIdOrThrow(operatorId)).thenReturn(new UserModel());
        when(orderRepositoryPort.findById(orderId)).thenReturn(java.util.Optional.of(order));

        assertThatThrownBy(() -> orderService.updateOrderStatus(orderId, OrderStatus.PENDING_PAYMENT, null, operatorId))
                .isInstanceOf(DomainException.class)
                .extracting("errorCode").isEqualTo(ErrorCode.ORDER_INVALID_STATUS);
    }
}
