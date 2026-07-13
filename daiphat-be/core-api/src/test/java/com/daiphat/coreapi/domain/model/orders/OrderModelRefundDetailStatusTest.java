package com.daiphat.coreapi.domain.model.orders;

import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OrderModelRefundDetailStatusTest {

    @Test
    @DisplayName("cancelByCustomerRefund marks details REFUND_PENDING")
    void cancelByCustomerRefund_marksRefundPending() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.ACTIVE)
                .price(BigDecimal.TEN)
                .build();
        OrderModel order = OrderModel.builder()
                .status(OrderStatus.PAID)
                .orderType(OrderType.ONLINE)
                .orderDetails(new ArrayList<>(List.of(detail)))
                .build();

        order.cancelByCustomerRefund("Khách hủy");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUND_PENDING);
    }

    @Test
    @DisplayName("cancelAfterPayment keeps INACTIVE for non-refund cancel")
    void cancelAfterPayment_marksInactive() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.ACTIVE)
                .price(BigDecimal.TEN)
                .build();
        OrderModel order = OrderModel.builder()
                .status(OrderStatus.PREPARING)
                .orderType(OrderType.ONLINE)
                .orderDetails(new ArrayList<>(List.of(detail)))
                .build();

        order.cancelAfterPayment("Admin hủy");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.INACTIVE);
    }

    @Test
    @DisplayName("cancelAfterPaymentForRefund marks details REFUND_PENDING")
    void cancelAfterPaymentForRefund_marksRefundPending() {
        OrderDetailModel detail = OrderDetailModel.builder()
                .status(OrderDetailStatus.ACTIVE)
                .price(BigDecimal.TEN)
                .build();
        OrderModel order = OrderModel.builder()
                .status(OrderStatus.PREPARING)
                .orderType(OrderType.ONLINE)
                .orderDetails(new ArrayList<>(List.of(detail)))
                .build();

        order.cancelAfterPaymentForRefund("Khách hoàn tiền");

        assertThat(detail.getStatus()).isEqualTo(OrderDetailStatus.REFUND_PENDING);
    }
}
