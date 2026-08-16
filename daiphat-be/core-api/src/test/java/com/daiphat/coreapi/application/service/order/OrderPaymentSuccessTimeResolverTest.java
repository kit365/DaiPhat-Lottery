package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderPaymentSuccessTimeResolver")
class OrderPaymentSuccessTimeResolverTest {

    private final TransactionRepositoryPort transactionRepositoryPort = mock(TransactionRepositoryPort.class);
    private final OrderPaymentSuccessTimeResolver resolver =
            new OrderPaymentSuccessTimeResolver(transactionRepositoryPort);

    @Test
    @DisplayName("prefers paidAt of loaded COMPLETED order payments")
    void resolve_fromMemoryPaidAt() {
        LocalDateTime paidAt = LocalDateTime.now().minusMinutes(2);
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .transactions(List.of(TransactionModel.builder()
                        .status(TransactionStatus.COMPLETED)
                        .paidAt(paidAt)
                        .build()))
                .build();

        assertThat(resolver.resolve(order)).contains(paidAt);
    }

    @Test
    @DisplayName("queries DB when loaded transactions are empty")
    void resolve_fallsBackToDb() {
        UUID orderId = UUID.randomUUID();
        LocalDateTime paidAt = LocalDateTime.now().minusMinutes(1);
        OrderModel order = OrderModel.builder()
                .id(orderId)
                .transactions(List.of())
                .build();
        when(transactionRepositoryPort.findLatestPaymentSuccessAt(orderId)).thenReturn(Optional.of(paidAt));

        assertThat(resolver.resolve(order)).contains(paidAt);
        verify(transactionRepositoryPort).findLatestPaymentSuccessAt(orderId);
    }

    @Test
    @DisplayName("skips REFUND rows even when they are newer")
    void resolve_skipsRefundRows() {
        LocalDateTime paymentPaidAt = LocalDateTime.now().minusMinutes(8);
        OrderModel order = OrderModel.builder()
                .id(UUID.randomUUID())
                .transactions(List.of(
                        TransactionModel.builder()
                                .status(TransactionStatus.COMPLETED)
                                .type(TransactionType.REFUND)
                                .transactionType(TransactionBusinessType.ORDER_REFUND)
                                .paidAt(LocalDateTime.now())
                                .build(),
                        TransactionModel.builder()
                                .status(TransactionStatus.COMPLETED)
                                .type(TransactionType.ONLINE)
                                .transactionType(TransactionBusinessType.ORDER_PAYMENT)
                                .paidAt(paymentPaidAt)
                                .build()))
                .build();

        assertThat(resolver.resolve(order)).contains(paymentPaidAt);
    }
}
