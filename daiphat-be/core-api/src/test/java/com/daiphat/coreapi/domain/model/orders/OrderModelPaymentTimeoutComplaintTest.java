package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderModelPaymentTimeoutComplaintTest {

    @Test
    void submitPaymentTimeoutComplaint_movesOnlyTimedOutCancelledOrderToPendingVerification() {
        OrderModel order = timedOutOrder();

        order.submitPaymentTimeoutComplaint("https://storage.example/proof.png", LocalDateTime.of(2026, 8, 17, 10, 0));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAYMENT_COMPLAINT_PENDING);
        assertThat(order.getPaymentComplaintEvidenceUrl()).isEqualTo("https://storage.example/proof.png");
        assertThat(order.getPaymentComplaintSubmittedAt()).isEqualTo(LocalDateTime.of(2026, 8, 17, 10, 0));
        assertThat(order.getCancelType()).isEqualTo(OrderCancelType.SYSTEM_PAYMENT_TIMEOUT);
    }

    @Test
    void submitPaymentTimeoutComplaint_rejectsOtherCancelledReasons() {
        OrderModel order = timedOutOrder();
        order.setCancelType(OrderCancelType.CUSTOMER_REQUEST);

        assertThatThrownBy(() -> order.submitPaymentTimeoutComplaint("https://storage.example/proof.png", LocalDateTime.now()))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void submitPaymentTimeoutComplaint_explainsWhenStorageDidNotReturnEvidenceUrl() {
        OrderModel order = timedOutOrder();

        assertThatThrownBy(() -> order.submitPaymentTimeoutComplaint(" ", LocalDateTime.now()))
                .isInstanceOfSatisfying(DomainException.class, exception ->
                        assertThat(exception.getInternalMessage())
                                .contains("Không thể lưu ảnh chứng từ thanh toán")
                );
    }

    @Test
    void approvePaymentTimeoutComplaint_requiresPendingVerificationAndMarksPaid() {
        OrderModel order = timedOutOrder();
        order.submitPaymentTimeoutComplaint("https://storage.example/proof.png", LocalDateTime.of(2026, 8, 17, 10, 0));

        order.approvePaymentTimeoutComplaint(LocalDateTime.of(2026, 8, 17, 10, 5));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaymentComplaintResolvedAt()).isEqualTo(LocalDateTime.of(2026, 8, 17, 10, 5));
        assertThat(order.getCancelType()).isNull();
    }

    @Test
    void rejectPaymentTimeoutComplaint_returnsToCancelledWithoutLosingOriginalCancellationType() {
        OrderModel order = timedOutOrder();
        order.submitPaymentTimeoutComplaint("https://storage.example/proof.png", LocalDateTime.now());

        order.rejectPaymentTimeoutComplaint("Không tìm thấy giao dịch trên sao kê", LocalDateTime.of(2026, 8, 17, 10, 5));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getCancelType()).isEqualTo(OrderCancelType.SYSTEM_PAYMENT_TIMEOUT);
        assertThat(order.getPaymentComplaintResolutionReason()).isEqualTo("Không tìm thấy giao dịch trên sao kê");
    }

    private OrderModel timedOutOrder() {
        return OrderModel.builder()
                .orderType(OrderType.ONLINE)
                .status(OrderStatus.CANCELLED)
                .cancelType(OrderCancelType.SYSTEM_PAYMENT_TIMEOUT)
                .cancelledAt(LocalDateTime.of(2026, 8, 17, 9, 30))
                .build();
    }
}
