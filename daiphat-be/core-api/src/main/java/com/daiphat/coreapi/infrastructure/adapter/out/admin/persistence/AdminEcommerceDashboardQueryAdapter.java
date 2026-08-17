package com.daiphat.coreapi.infrastructure.adapter.out.admin.persistence;

import com.daiphat.coreapi.application.port.out.admin.AdminEcommerceDashboardQueryPort;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class AdminEcommerceDashboardQueryAdapter implements AdminEcommerceDashboardQueryPort {

    private final LotteryTicketRepository lotteryTicketRepository;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;

    @Override
    public long countActiveTicketProducts() {
        return lotteryTicketRepository.countActiveProducts();
    }

    @Override
    public long countOrders() {
        return orderRepository.count();
    }

    @Override
    public BigDecimal sumCompletedOrderPayments(LocalDateTime fromInclusive, LocalDateTime toExclusive) {
        return transactionRepository.sumCompletedOrderPayments(fromInclusive, toExclusive);
    }
}
