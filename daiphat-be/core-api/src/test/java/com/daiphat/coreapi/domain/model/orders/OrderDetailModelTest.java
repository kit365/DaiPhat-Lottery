package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrderDetailModelTest {

    @Test
    @DisplayName("initializeForCreate defaults status to ACTIVE")
    void initializeForCreate_defaultsActive() {
        OrderDetailModel detail = OrderDetailModel.builder().status(null).build();
        detail.initializeForCreate();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.HANDOVER_IN_PROGRESS);
    }

    @Test
    @DisplayName("paid online detail moves from company holding to staff handover")
    void paidOnlineDetail_movesFromProxyHoldingToHandover() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .build();

        detail.markProxyHolding();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.PROXY_HOLDING);

        detail.openHandover();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.HANDOVER_IN_PROGRESS);
    }

    @Test
    @DisplayName("customer rejection requires a reason and keeps a separate audit state")
    void customerRejection_requiresReason() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .build();

        assertThatThrownBy(() -> detail.markRejectedByCustomer(" ", java.util.UUID.randomUUID(), java.time.LocalDateTime.now()))
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }

    @Test
    @DisplayName("ACTIVE → REFUND_PENDING → REFUNDED")
    void refundLifecycle() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .build();

        detail.markRefundPending();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUND_PENDING);

        detail.markRefunded();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUNDED);
        assertThat(detail.isRefunded()).isTrue();
    }

    @Test
    @DisplayName("REFUND_PENDING can restore to handover")
    void restoreToHandoverInProgress() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.REFUND_PENDING)
                .build();

        detail.restoreToHandoverInProgress();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.HANDOVER_IN_PROGRESS);
    }

    @Test
    @DisplayName("cancelled timeout detail can be restored only by verified payment processing")
    void cancelledDetail_canReturnToCompanyHoldingWhenPaymentIsVerified() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .build();

        detail.markCancelled();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.CANCELLED);

        detail.markProxyHolding();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.PROXY_HOLDING);
    }

    @Test
    @DisplayName("only a handover detail can be rejected by the customer")
    void rejectByCustomer_fromHandoverOnly() {
        OrderDetailModel active = OrderDetailModel.builder()
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .build();
        active.markRejectedByCustomer("Khách chỉ nhận một phần", java.util.UUID.randomUUID(), java.time.LocalDateTime.now());
        assertThat(active.getStatus()).isEqualTo(OrderDetailStatus.REJECTED_BY_CUSTOMER);

        OrderDetailModel pending = OrderDetailModel.builder()
                .status(OrderDetailStatus.REFUND_PENDING)
                .build();
        assertThatThrownBy(() -> pending.markRejectedByCustomer(
                "Khách chỉ nhận một phần", java.util.UUID.randomUUID(), java.time.LocalDateTime.now()))
                .isInstanceOf(DomainException.class);
    }

    @Test
    @DisplayName("invalid transitions throw ORDER_DETAIL_INVALID_STATUS")
    void invalidTransitions() {
        OrderDetailModel refunded = OrderDetailModel.builder()
                .status(OrderDetailStatus.REFUNDED)
                .build();

        assertThatThrownBy(refunded::markRefundPending)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_DETAIL_INVALID_STATUS);

        OrderDetailModel active = OrderDetailModel.builder()
                .status(OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .build();
        assertThatThrownBy(active::markRefunded)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
    }
}
