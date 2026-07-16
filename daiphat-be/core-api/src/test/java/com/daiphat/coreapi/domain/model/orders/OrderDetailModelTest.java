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
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.ACTIVE);
    }

    @Test
    @DisplayName("ACTIVE → REFUND_PENDING → REFUNDED")
    void refundLifecycle() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.ACTIVE)
                .build();

        detail.markRefundPending();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUND_PENDING);

        detail.markRefunded();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUNDED);
        assertThat(detail.isRefunded()).isTrue();
    }

    @Test
    @DisplayName("REFUND_PENDING can restore to ACTIVE")
    void restoreActive() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.REFUND_PENDING)
                .build();

        detail.restoreActive();
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.ACTIVE);
    }

    @Test
    @DisplayName("markInactive only transitions from ACTIVE")
    void markInactive_fromActiveOnly() {
        OrderDetailModel active = OrderDetailModel.builder()
                .status(OrderDetailStatus.ACTIVE)
                .build();
        active.markInactive();
        assertThat(active.getStatus()).isEqualTo(OrderDetailStatus.INACTIVE);

        OrderDetailModel pending = OrderDetailModel.builder()
                .status(OrderDetailStatus.REFUND_PENDING)
                .build();
        pending.markInactive();
        assertThat(pending.getStatus()).isEqualTo(OrderDetailStatus.REFUND_PENDING);
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
                .status(OrderDetailStatus.ACTIVE)
                .build();
        assertThatThrownBy(active::markRefunded)
                .isInstanceOf(DomainException.class)
                .extracting(ex -> ((DomainException) ex).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
    }
}
