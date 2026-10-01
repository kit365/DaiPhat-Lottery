package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.service.lotteries.TicketSalesCutoffPolicy;
import com.daiphat.coreapi.application.service.refund.OrderCancellationRefundService;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.orders.OrderCancelReasonDefaults;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.shared.time.VietnamClock;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderPreparationExpiryWorker {

    private final OrderRepositoryPort orderRepositoryPort;
    private final TicketSalesCutoffPolicy ticketSalesCutoffPolicy;
    private final OrderCancellationRefundService orderCancellationRefundService;
    private final VietnamClock vietnamClock;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean expireSingle(UUID orderId) {
        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.PREPARING) {
            return false;
        }
        if (order.getUserId() == null) {
            log.error("Cannot auto-cancel PREPARING order {} because it has no customer", orderId);
            return false;
        }

        LocalDateTime cutoff = ticketSalesCutoffPolicy.resolveEarliestCutoff(order).orElse(null);
        if (cutoff == null) {
            log.error("Cannot auto-cancel PREPARING order {} because no ticket cutoff is resolvable", orderId);
            return false;
        }
        if (vietnamClock.now().isBefore(cutoff)) {
            return false;
        }

        orderCancellationRefundService.cancelLockedOrder(
                order,
                OrderCancelReasonDefaults.SYSTEM_PREPARATION_TIMEOUT,
                OrderCancelType.SYSTEM_PREPARATION_TIMEOUT,
                RefundRequestRole.SYSTEM,
                "SYSTEM",
                true);
        log.info("Auto-cancelled overdue PREPARING order {} at cutoff {}", orderId, cutoff);
        return true;
    }
}
