package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundProcessingUrgency;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
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
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefundRequestStaffService")
class RefundRequestStaffServiceTest {

    private final RefundRequestRepositoryPort refundRequestRepositoryPort = mock(RefundRequestRepositoryPort.class);
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort = mock(UserBankAccountRepositoryPort.class);
    private final OrderRepositoryPort orderRepositoryPort = mock(OrderRepositoryPort.class);
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort = mock(OrderDetailSerialRepositoryPort.class);
    private final UserRepositoryPort userRepositoryPort = mock(UserRepositoryPort.class);
    private final LotteryTicketServicePort lotteryTicketServicePort = mock(LotteryTicketServicePort.class);
    private final RefundApplicationMapper refundApplicationMapper = mock(RefundApplicationMapper.class);
    private final OrderApplicationMapper orderApplicationMapper = mock(OrderApplicationMapper.class);
    private final RefundProcessingDeadlineService refundProcessingDeadlineService = mock(RefundProcessingDeadlineService.class);
    private final RefundTicketItemResolver refundTicketItemResolver = mock(RefundTicketItemResolver.class);
    private final com.daiphat.coreapi.application.port.out.file.StoragePort storagePort =
            mock(com.daiphat.coreapi.application.port.out.file.StoragePort.class);
    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);

    private RefundRequestStaffService refundRequestStaffService;

    private final UUID staffId = UUID.randomUUID();
    private final UUID customerId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();
    private final Long refundId = 10L;

    @BeforeEach
    void setUp() {
        refundRequestStaffService = new RefundRequestStaffService(
                refundRequestRepositoryPort,
                userBankAccountRepositoryPort,
                orderRepositoryPort,
                orderDetailSerialRepositoryPort,
                userRepositoryPort,
                lotteryTicketServicePort,
                refundApplicationMapper,
                orderApplicationMapper,
                refundProcessingDeadlineService,
                refundTicketItemResolver,
                storagePort,
                transactionRepositoryPort,
                eventPublisher);

        when(refundProcessingDeadlineService.evaluate(any())).thenReturn(
                new RefundProcessingDeadlineService.ProcessingEvaluation(
                        LocalDateTime.now().plusDays(7),
                        604800L,
                        RefundProcessingUrgency.ON_TIME));
        when(refundProcessingDeadlineService.isOverdue(any())).thenReturn(false);
        org.mockito.Mockito.lenient()
                .when(transactionRepositoryPort.findLatestByOrderIdAndType(any(), any()))
                .thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("markTransferred: APPROVED → PAID")
    void markTransferred_fromApproved() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .id(refundId)
                .orderId(orderId)
                .requestedBy(customerId)
                .status(RefundRequestStatus.APPROVED)
                .refundReason("Đổi ý")
                .bankAccountId(1L)
                .refundAmount(BigDecimal.valueOf(20000))
                .build();

        when(refundRequestRepositoryPort.findById(refundId)).thenReturn(Optional.of(refund));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userBankAccountRepositoryPort.findById(1L)).thenReturn(Optional.of(bankAccount()));
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(
                OrderModel.builder().id(orderId).orderCode("ORD-001").build()));
        when(transactionRepositoryPort.save(any(TransactionModel.class))).thenAnswer(inv -> {
            TransactionModel tx = inv.getArgument(0);
            tx.setId(500L);
            return tx;
        });
        when(orderApplicationMapper.toTransactionResponse(any())).thenReturn(null);
        when(refundApplicationMapper.enrichResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);
        when(userRepositoryPort.findById(staffId)).thenReturn(Optional.of(
                com.daiphat.coreapi.domain.model.UserModel.builder()
                        .id(staffId)
                        .lastName("Nguyen")
                        .firstName("Van A")
                        .build()));

        refundRequestStaffService.markTransferred(
                refundId,
                staffId,
                new TransferRefundRequestRequest("https://evidence.url", "Đã chuyển"));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.PAID);

        ArgumentCaptor<TransactionModel> txCaptor = ArgumentCaptor.forClass(TransactionModel.class);
        verify(transactionRepositoryPort).save(txCaptor.capture());
        assertThat(txCaptor.getValue().getType()).isEqualTo(TransactionType.REFUND);
        assertThat(txCaptor.getValue().getPaymentEvidenceUrl()).isEqualTo("https://evidence.url");
        assertThat(txCaptor.getValue().getPaymentBy()).isEqualTo(staffId);
        assertThat(txCaptor.getValue().getNote()).isEqualTo("Refund request processed by Nguyen Van A.");
        verify(eventPublisher).publishEvent(any(RefundRequestStatusChangedEvent.class));
    }

    @Test
    @DisplayName("markTransferred: rejects blank payment evidence URL")
    void markTransferred_rejectsBlankEvidenceUrl() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .id(refundId)
                .orderId(orderId)
                .requestedBy(customerId)
                .status(RefundRequestStatus.READY_TO_PAY)
                .refundReason("Đổi ý")
                .bankAccountId(1L)
                .refundAmount(BigDecimal.valueOf(20000))
                .build();

        when(refundRequestRepositoryPort.findById(refundId)).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> refundRequestStaffService.markTransferred(
                refundId,
                staffId,
                new TransferRefundRequestRequest("   ", null)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(transactionRepositoryPort, never()).save(any());
        verify(refundRequestRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("markTransferred: READY_TO_PAY → PAID")
    void markTransferred_fromReadyToPay() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .id(refundId)
                .orderId(orderId)
                .requestedBy(customerId)
                .status(RefundRequestStatus.READY_TO_PAY)
                .refundReason("Đổi ý")
                .bankAccountId(1L)
                .refundAmount(BigDecimal.valueOf(20000))
                .build();

        when(refundRequestRepositoryPort.findById(refundId)).thenReturn(Optional.of(refund));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userBankAccountRepositoryPort.findById(1L)).thenReturn(Optional.of(bankAccount()));
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(
                OrderModel.builder().id(orderId).orderCode("ORD-001").build()));
        when(transactionRepositoryPort.save(any(TransactionModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderApplicationMapper.toTransactionResponse(any())).thenReturn(null);
        when(refundApplicationMapper.enrichResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);
        when(userRepositoryPort.findById(staffId)).thenReturn(Optional.of(
                com.daiphat.coreapi.domain.model.UserModel.builder()
                        .id(staffId)
                        .lastName("Tran")
                        .firstName("Thi B")
                        .build()));

        refundRequestStaffService.markTransferred(
                refundId,
                staffId,
                new TransferRefundRequestRequest("https://evidence.url", null));

        assertThat(refund.getStatus()).isEqualTo(RefundRequestStatus.PAID);
        ArgumentCaptor<TransactionModel> txCaptor = ArgumentCaptor.forClass(TransactionModel.class);
        verify(transactionRepositoryPort).save(txCaptor.capture());
        assertThat(txCaptor.getValue().getNote()).isEqualTo("Refund request processed by Tran Thi B.");
    }

    @Test
    @DisplayName("markTransferred: rejects WAITING_FOR_INFO without bank account")
    void markTransferred_rejectsWaitingWithoutBank() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .id(refundId)
                .orderId(orderId)
                .requestedBy(customerId)
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .refundReason("Sự cố")
                .bankAccountId(null)
                .refundAmount(BigDecimal.valueOf(20000))
                .build();
        when(refundRequestRepositoryPort.findById(refundId)).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> refundRequestStaffService.markTransferred(
                refundId,
                staffId,
                new TransferRefundRequestRequest("https://evidence.url", null)))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
    }

    @Test
    @DisplayName("cancelOrderWithRefund: creates WAITING_FOR_INFO, cancels order, releases stock")
    void cancelOrderWithRefund_success() {
        OrderModel order = preparingOrder();
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(order));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(false);
        when(orderRepositoryPort.save(any(OrderModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> {
            RefundRequestModel model = inv.getArgument(0);
            model.setId(refundId);
            return model;
        });
        when(refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, refundId)).thenReturn(1);
        when(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(refundId)).thenReturn(List.of(1L));
        when(refundApplicationMapper.enrichResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);

        refundRequestStaffService.cancelOrderWithRefund(
                orderId,
                staffId,
                new com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest("Vé lỗi in"));

        ArgumentCaptor<RefundRequestModel> refundCaptor = ArgumentCaptor.forClass(RefundRequestModel.class);
        verify(refundRequestRepositoryPort).save(refundCaptor.capture());
        assertThat(refundCaptor.getValue().getStatus()).isEqualTo(RefundRequestStatus.WAITING_FOR_INFO);
        assertThat(refundCaptor.getValue().getBankAccountId()).isNull();
        assertThat(refundCaptor.getValue().getRefundReason()).isEqualTo("Vé lỗi in");

        ArgumentCaptor<OrderModel> orderCaptor = ArgumentCaptor.forClass(OrderModel.class);
        verify(orderRepositoryPort).save(orderCaptor.capture());
        assertThat(orderCaptor.getValue().getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(lotteryTicketServicePort).returnSoldTicketForOrder(99L);
        verify(eventPublisher).publishEvent(any(RefundRequestStatusChangedEvent.class));
        verify(eventPublisher).publishEvent(any(OrderStatusChangedEvent.class));
    }

    @Test
    @DisplayName("cancelOrderWithRefund: rejects when refund already exists")
    void cancelOrderWithRefund_duplicateRejected() {
        when(orderRepositoryPort.findByIdWithLock(orderId)).thenReturn(Optional.of(preparingOrder()));
        when(refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)).thenReturn(true);

        assertThatThrownBy(() -> refundRequestStaffService.cancelOrderWithRefund(
                orderId,
                staffId,
                new com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest("Vé lỗi")))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);

        verify(refundRequestRepositoryPort, never()).save(any());
    }

    @Test
    @DisplayName("attachBankAccount: WAITING_FOR_INFO → READY_TO_PAY")
    void attachBankAccount_success() {
        RefundRequestModel refund = RefundRequestModel.builder()
                .id(refundId)
                .orderId(orderId)
                .requestedBy(customerId)
                .status(RefundRequestStatus.WAITING_FOR_INFO)
                .refundReason("Vé lỗi")
                .refundAmount(BigDecimal.valueOf(20000))
                .build();

        when(refundRequestRepositoryPort.findById(refundId)).thenReturn(Optional.of(refund));
        when(userBankAccountRepositoryPort.findByIdAndUserId(1L, customerId)).thenReturn(Optional.of(bankAccount()));
        when(refundRequestRepositoryPort.save(any(RefundRequestModel.class))).thenAnswer(inv -> inv.getArgument(0));
        when(orderRepositoryPort.findById(orderId)).thenReturn(Optional.of(
                OrderModel.builder().id(orderId).orderCode("ORD-001").build()));
        when(refundApplicationMapper.enrichResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(null);

        refundRequestStaffService.attachBankAccount(
                refundId,
                staffId,
                new com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest(1L));

        assertThat(refund.getStatus()).isEqualTo(RefundRequestStatus.READY_TO_PAY);
        assertThat(refund.getBankAccountId()).isEqualTo(1L);
        verify(eventPublisher).publishEvent(any(RefundRequestStatusChangedEvent.class));
    }

    private RefundRequestModel pendingRefund() {
        return RefundRequestModel.builder()
                .id(refundId)
                .orderId(orderId)
                .requestedBy(customerId)
                .status(RefundRequestStatus.READY_TO_PAY)
                .refundReason("Đổi ý")
                .bankAccountId(1L)
                .refundAmount(BigDecimal.valueOf(20000))
                .build();
    }

    private OrderModel preparingOrder() {
        return OrderModel.builder()
                .id(orderId)
                .userId(customerId)
                .orderCode("ORD-001")
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.PREPARING)
                .totalAmount(BigDecimal.valueOf(20000))
                .transactions(List.of(TransactionModel.builder()
                        .status(com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus.COMPLETED)
                        .amount(BigDecimal.valueOf(20000))
                        .paidAt(LocalDateTime.now())
                        .build()))
                .orderDetails(List.of(OrderDetailModel.builder()
                        .lotteryTicketSerialId(99L)
                        .price(BigDecimal.valueOf(20000))
                        .build()))
                .build();
    }

    private UserBankAccountModel bankAccount() {
        return UserBankAccountModel.builder().id(1L).userId(customerId).build();
    }
}
