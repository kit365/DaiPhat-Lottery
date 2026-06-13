package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.order.TransactionServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.strategy.payment.PaymentStrategy;
import com.daiphat.coreapi.application.strategy.payment.PaymentStrategyFactory;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService implements TransactionServicePort {

    private final OrderRepositoryPort orderRepositoryPort;
    private final UserLookupServicePort userLookupServicePort;
    private final PaymentStrategyFactory paymentStrategyFactory;
    private final LotteryTicketServicePort lotteryTicketServicePort;

    @Override
    @Transactional
    public PaymentResult processPayment(UUID orderId, TransactionType type) {
        OrderModel order = getOrderOrThrow(orderId);
        TransactionModel transaction = getPendingTransactionByType(order, type);

        PaymentStrategy strategy = paymentStrategyFactory.getStrategy(type);
        PaymentResult paymentResult = strategy.createPayment(order, transaction);
        orderRepositoryPort.save(order);
        return paymentResult;
    }

    @Override
    @Transactional
    public OrderModel handleOnlinePaymentSuccess(UUID orderId, String paymentRef) {
        OrderModel order = getOrderOrThrow(orderId);
        TransactionModel transaction = getPendingTransactionByType(order, TransactionType.ONLINE);
        PaymentStrategy strategy = paymentStrategyFactory.getStrategy(TransactionType.ONLINE);

        strategy.handleSuccess(order, transaction, paymentRef);
        order.getOrderDetails().forEach(detail -> lotteryTicketServicePort.markSoldForOrder(detail.getLotteryTicketId()));
        OrderModel saved = orderRepositoryPort.save(order);
        log.info("Handled online payment success for order: {}", orderId);
        return saved;
    }

    @Override
    @Transactional
    public OrderModel handleOnlinePaymentFailure(UUID orderId, String failureReason) {
        OrderModel order = getOrderOrThrow(orderId);
        TransactionModel transaction = getPendingTransactionByType(order, TransactionType.ONLINE);
        PaymentStrategy strategy = paymentStrategyFactory.getStrategy(TransactionType.ONLINE);

        strategy.handleFailure(order, transaction, failureReason);

        OrderModel saved = orderRepositoryPort.save(order);
        log.info("Handled online payment failure for order: {}", orderId);
        return saved;
    }

    @Override
    @Transactional
    public OrderModel collectDirectOrderCash(UUID orderId, UUID operatorId, String note) {
        userLookupServicePort.findByIdOrThrow(operatorId);

        OrderModel order = getOrderOrThrow(orderId);
        TransactionModel transaction = getPendingTransactionByType(order, TransactionType.OFFLINE);

        transaction.setNote(note);
        transaction.collectCash(operatorId);
        order.markPaid();
        order.completeDirectOrder(operatorId);

        OrderModel saved = orderRepositoryPort.save(order);
        log.info("Collected cash for direct order: {}", orderId);
        return saved;
    }

    private OrderModel getOrderOrThrow(UUID orderId) {
        return orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
    }

    private TransactionModel getPendingTransactionByType(OrderModel order, TransactionType type) {
        return order.getTransactions().stream()
                .filter(transaction -> transaction.getType() == type
                        && transaction.getStatus() == com.daiphat.coreapi.domain.model.enums.order.TransactionStatus.PENDING)
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.TRANSACTION_NOT_FOUND));
    }
}
