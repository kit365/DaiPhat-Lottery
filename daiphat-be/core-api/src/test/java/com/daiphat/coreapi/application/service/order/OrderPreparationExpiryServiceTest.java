package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrderPreparationExpiryServiceTest {

    @Test
    void oneOrderFailureDoesNotAbortTheSweep() {
        OrderRepositoryPort repository = mock(OrderRepositoryPort.class);
        OrderPreparationExpiryWorker worker = mock(OrderPreparationExpiryWorker.class);
        UUID malformedOrder = UUID.randomUUID();
        UUID overdueOrder = UUID.randomUUID();
        when(repository.findOrderIdsByStatus(OrderStatus.PREPARING))
                .thenReturn(List.of(malformedOrder, overdueOrder));
        when(worker.expireSingle(malformedOrder)).thenThrow(new IllegalStateException("bad order"));
        when(worker.expireSingle(overdueOrder)).thenReturn(true);

        int expired = new OrderPreparationExpiryService(repository, worker)
                .expireOverduePreparingOrders();

        assertThat(expired).isEqualTo(1);
        verify(worker).expireSingle(overdueOrder);
    }
}
