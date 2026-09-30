package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderPreparationExpiryService {

    private final OrderRepositoryPort orderRepositoryPort;
    private final OrderPreparationExpiryWorker worker;

    public int expireOverduePreparingOrders() {
        int expired = 0;
        for (UUID orderId : orderRepositoryPort.findOrderIdsByStatus(OrderStatus.PREPARING)) {
            try {
                if (worker.expireSingle(orderId)) {
                    expired++;
                }
            } catch (Exception ex) {
                log.error("Failed to expire overdue PREPARING order {}: {}", orderId, ex.getMessage(), ex);
            }
        }
        return expired;
    }
}
