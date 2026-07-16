package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.GatewayCallbackResult;
import com.daiphat.coreapi.application.dto.order.PaymentResult;
import com.daiphat.coreapi.application.dto.order.PendingPaymentCountdownResult;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.event.OrderPaidForProcessingEvent;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.order.TransactionServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentAttemptCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategy;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategyFactory;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderCancelType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.payment.PaymentGateway;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderCancelReasonDefaults;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService implements TransactionServicePort {

    @Value("${daiphat.order.pending-payment-ttl-seconds}")
    private long pendingPaymentTtlSeconds = 600;

    @Value("${daiphat.order.payment-failure-max-attempts}")
    private int paymentFailureMaxAttempts = 3;

    private static final String PAYMENT_TIMEOUT_REASON = OrderCancelReasonDefaults.SYSTEM_PAYMENT_TIMEOUT;

    private final OrderRepositoryPort orderRepositoryPort;
    private final UserLookupServicePort userLookupServicePort;
    private final PaymentGatewayStrategyFactory paymentGatewayStrategyFactory;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final PaymentCountdownCachePort paymentCountdownCachePort;
    private final PaymentAttemptCachePort paymentAttemptCachePort;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(noRollbackFor = DomainException.class)
    public PaymentResult processPayment(UUID orderId, Long transactionId, PaymentGateway gateway) {
        OrderModel order = getOrderWithLockOrThrow(orderId);
        TransactionModel transaction = getPendingOnlineTransaction(order, transactionId, gateway);

        try {
            PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(gateway);
            PaymentResult paymentResult = strategy.createPayment(order, transaction);
            orderRepositoryPort.save(order);
            return paymentResult;
        } catch (DomainException ex) {
            handlePaymentLinkCreationFailure(order, transaction, ex.getMessage());
            throw ex;
        } catch (Exception ex) {
            handlePaymentLinkCreationFailure(order, transaction, "Không thể khởi tạo liên kết thanh toán.");
            throw new DomainException(ErrorCode.INTERNAL_SERVER_ERROR, ex);
        }
    }

    @Override
    @Transactional
    public OrderModel handleOnlinePaymentSuccess(UUID orderId, Long transactionId, PaymentGateway gateway, String paymentRef) {
        OrderModel order = getOrderWithLockOrThrow(orderId);
        TransactionModel transaction = getPendingOnlineTransaction(order, transactionId, gateway);
        PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(gateway);

        strategy.handleSuccess(order, transaction, new GatewayCallbackResult(
                true,
                transaction.getGatewayOrderCode(),
                paymentRef,
                "Manual success update",
                null,
                null
        ));
        reconcileDirectOrderPayment(order);
        order.getOrderDetails().forEach(detail -> lotteryTicketServicePort.markSoldForOrder(detail.getLotteryTicketSerialId()));
        OrderModel saved = orderRepositoryPort.save(order);
        clearFailureAttempts(transaction);
        clearCountdownIfResolved(saved);
        publishPaymentSuccessNotifications(saved);
        log.info("Handled online payment success for order: {}", orderId);
        return saved;
    }

    @Override
    @Transactional
    public OrderModel handleOnlinePaymentFailure(UUID orderId, Long transactionId, PaymentGateway gateway, String failureReason) {
        OrderModel order = getOrderWithLockOrThrow(orderId);
        TransactionModel transaction = getPendingOnlineTransaction(order, transactionId, gateway);
        PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(gateway);

        strategy.handleFailure(order, transaction, new GatewayCallbackResult(
                false,
                transaction.getGatewayOrderCode(),
                null,
                failureReason,
                null,
                null
        ));
        enforceFailureAttemptLimit(order, transaction);

        OrderModel saved = orderRepositoryPort.save(order);
        log.info("Handled online payment failure for order: {}", orderId);
        return saved;
    }

    @Override
    @Transactional
    public OrderModel cancelOnlinePayment(UUID orderId, Long transactionId, PaymentGateway gateway, String reason) {
        OrderModel order = getOrderWithLockOrThrow(orderId);
        TransactionModel transaction = getPendingOnlineTransaction(order, transactionId, gateway);
        PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(gateway);
        String effectiveReason = reason != null && !reason.isBlank()
                ? reason
                : "Cancelled payment link on gateway " + gateway.name();

        strategy.cancelPayment(order, transaction, effectiveReason);
        if (transaction.getStatus() == TransactionStatus.PENDING) {
            transaction.markCancelled(effectiveReason);
        }
        clearFailureAttempts(transaction);
        if (order.getCompletedTransactionAmount().signum() == 0 && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            releaseReservedTickets(order);
            order.cancelPendingPayment(effectiveReason);
        }

        OrderModel saved = orderRepositoryPort.save(order);
        clearCountdownIfResolved(saved);
        log.info("Cancelled payment link for order {} via gateway {}", orderId, gateway);
        return saved;
    }

    @Override
    @Transactional
    public void processGatewayCallback(PaymentGateway gateway, String rawPayload) {
        PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(gateway);
        GatewayCallbackResult callbackResult = strategy.parseCallback(rawPayload);
        if (callbackResult.gatewayOrderCode() == null) {
            log.warn("Ignoring {} callback without gatewayOrderCode.", gateway);
            return;
        }

        OrderModel order = orderRepositoryPort.findByGatewayOrderCode(callbackResult.gatewayOrderCode())
                .flatMap(existing -> existing.getId() != null
                        ? orderRepositoryPort.findByIdWithLock(existing.getId())
                        : java.util.Optional.empty())
                .orElse(null);
        if (order == null) {
            log.warn("Ignoring {} callback for unknown gatewayOrderCode {}.", gateway, callbackResult.gatewayOrderCode());
            return;
        }

        TransactionModel transaction;
        try {
            transaction = getPendingTransactionByGatewayOrderCode(order, callbackResult.gatewayOrderCode());
        } catch (DomainException ex) {
            log.warn("Ignoring {} callback for non-pending gatewayOrderCode {}.", gateway, callbackResult.gatewayOrderCode());
            return;
        }

        if (callbackResult.success()) {
            strategy.handleSuccess(order, transaction, callbackResult);
            clearFailureAttempts(transaction);
            reconcileDirectOrderPayment(order);
            order.getOrderDetails().forEach(detail -> lotteryTicketServicePort.markSoldForOrder(detail.getLotteryTicketSerialId()));
        } else {
            strategy.handleFailure(order, transaction, callbackResult);
            enforceFailureAttemptLimit(order, transaction);
        }

        OrderModel saved = orderRepositoryPort.save(order);
        clearCountdownIfResolved(saved);
        if (callbackResult.success()) {
            publishPaymentSuccessNotifications(saved);
        }
        log.info("Processed {} callback for gatewayOrderCode {}", gateway, callbackResult.gatewayOrderCode());
    }

    @Override
    @Transactional
    public OrderModel collectDirectOrderCash(UUID orderId, UUID operatorId, String note) {
        userLookupServicePort.findByIdOrThrow(operatorId);

        OrderModel order = getOrderWithLockOrThrow(orderId);
        TransactionModel transaction = getPendingOfflineTransaction(order);

        transaction.setNote(note);
        transaction.collectCash(operatorId);
        reconcileDirectOrderPayment(order, operatorId);

        OrderModel saved = orderRepositoryPort.save(order);
        clearCountdownIfResolved(saved);
        log.info("Collected cash for direct order: {}", orderId);
        return saved;
    }

    @Override
    @Transactional
    public int expirePendingPayments() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(pendingPaymentTtlSeconds);
        List<UUID> expiredOrderIds = orderRepositoryPort.findPendingPaymentOrderIdsCreatedBefore(threshold);
        int expiredCount = 0;

        for (UUID orderId : expiredOrderIds) {
            OrderModel order = orderRepositoryPort.findByIdWithLock(orderId).orElse(null);
            if (order == null) {
                continue;
            }
            if (order.getStatus() != OrderStatus.PENDING_PAYMENT || order.getCompletedTransactionAmount().signum() > 0) {
                continue;
            }

            cancelPendingTransactions(order);
            releaseReservedTickets(order);
            order.cancelPendingPayment(PAYMENT_TIMEOUT_REASON, OrderCancelType.SYSTEM_PAYMENT_TIMEOUT);
            orderRepositoryPort.save(order);
            paymentCountdownCachePort.clear(order.getId());
            expiredCount++;
        }
        return expiredCount;
    }

    @Override
    public PendingPaymentCountdownResult getPendingPaymentCountdown(UUID orderId) {
        OrderModel order = getOrderOrThrow(orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            return new PendingPaymentCountdownResult(orderId, 0, null, true);
        }

        long remainingSeconds = paymentCountdownCachePort.getRemainingSeconds(orderId).orElse(0L);
        return new PendingPaymentCountdownResult(
                orderId,
                remainingSeconds,
                remainingSeconds > 0 ? LocalDateTime.now().plusSeconds(remainingSeconds) : null,
                remainingSeconds <= 0
        );
    }

    @Override
    public List<EnumOptionResponse> getTransactionTypes() {
        return EnumOptionUtils.toEnumOptions(TransactionType.values());
    }

    @Override
    public List<EnumOptionResponse> getTransactionStatuses() {
        return EnumOptionUtils.toEnumOptions(TransactionStatus.values());
    }

    private void reconcileDirectOrderPayment(OrderModel order) {
        reconcileDirectOrderPayment(order, null);
    }

    private void reconcileDirectOrderPayment(OrderModel order, UUID operatorId) {
        if (order.getOrderType() != OrderType.DIRECT || !order.isFullyPaid()) {
            return;
        }
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            order.markPaid();
        }
        order.completeDirectOrder(operatorId);
    }

    private void publishPaymentSuccessNotifications(OrderModel order) {
        if (order.getId() == null) {
            return;
        }

        eventPublisher.publishEvent(OrderPaidForProcessingEvent.builder()
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .build());

        if (order.getUserId() == null || order.getStatus() == null) {
            return;
        }

        eventPublisher.publishEvent(OrderStatusChangedEvent.builder()
                .orderId(order.getId())
                .customerId(order.getUserId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .build());
    }

    private void cancelPendingTransactions(OrderModel order) {
        for (TransactionModel transaction : order.getTransactions()) {
            if (transaction.getStatus() != TransactionStatus.PENDING) {
                continue;
            }

            if (transaction.getType() == TransactionType.ONLINE
                    && transaction.getGateway() != null
                    && transaction.getGatewayOrderCode() != null) {
                PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(transaction.getGateway());
                try {
                    strategy.cancelPayment(order, transaction, PAYMENT_TIMEOUT_REASON);
                } catch (DomainException ex) {
                    log.warn("Could not cancel gateway link for expired order {} transaction {}: {}",
                            order.getId(), transaction.getId(), ex.getMessage());
                }
            }

            if (transaction.getStatus() == TransactionStatus.PENDING) {
                transaction.markCancelled(PAYMENT_TIMEOUT_REASON);
            }
            clearFailureAttempts(transaction);
        }
    }

    private void releaseReservedTickets(OrderModel order) {
        order.getOrderDetails().forEach(detail -> lotteryTicketServicePort.releaseReservationForOrder(detail.getLotteryTicketSerialId()));
    }

    private void clearCountdownIfResolved(OrderModel order) {
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT && order.getId() != null) {
            paymentCountdownCachePort.clear(order.getId());
        }
    }

    private void enforceFailureAttemptLimit(OrderModel order, TransactionModel transaction) {
        if (transaction.getId() == null || transaction.getStatus() != TransactionStatus.PENDING) {
            return;
        }

        long failureAttempts = paymentAttemptCachePort.incrementFailureAttempt(
                transaction.getId(),
                java.time.Duration.ofSeconds(pendingPaymentTtlSeconds)
        );
        if (failureAttempts < paymentFailureMaxAttempts) {
            return;
        }

        transaction.markCancelled("Thanh toán thất bại quá " + paymentFailureMaxAttempts + " lần.");
        clearFailureAttempts(transaction);

        if (order.getCompletedTransactionAmount().signum() == 0 && order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            releaseReservedTickets(order);
            order.cancelPendingPayment("Thanh toán thất bại quá " + paymentFailureMaxAttempts + " lần.");
            clearCountdownIfResolved(order);
        }
    }

    private void clearFailureAttempts(TransactionModel transaction) {
        if (transaction.getId() != null) {
            paymentAttemptCachePort.clearFailureAttempts(transaction.getId());
        }
    }

    private void handlePaymentLinkCreationFailure(OrderModel order, TransactionModel transaction, String reason) {
        String effectiveReason = (reason != null && !reason.isBlank())
                ? reason
                : "Không thể khởi tạo liên kết thanh toán.";

        log.warn("Payment link creation failed for order {} transaction {}: {}",
                order.getId(), transaction.getId(), effectiveReason);

        if (transaction.getStatus() == TransactionStatus.PENDING) {
            transaction.markCancelled(effectiveReason);
        }
        clearFailureAttempts(transaction);

        if (order.getCompletedTransactionAmount().signum() == 0
                && order.getStatus() == OrderStatus.PENDING_PAYMENT
                && order.getId() != null) {
            releaseReservedTickets(order);
            orderRepositoryPort.deleteById(order.getId());
            paymentCountdownCachePort.clear(order.getId());
            return;
        }

        OrderModel saved = orderRepositoryPort.save(order);
        clearCountdownIfResolved(saved);
    }

    private OrderModel getOrderOrThrow(UUID orderId) {
        return orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
    }

    private OrderModel getOrderWithLockOrThrow(UUID orderId) {
        return orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
    }

    private TransactionModel getPendingOfflineTransaction(OrderModel order) {
        return order.getTransactions().stream()
                .filter(transaction -> transaction.getType() == TransactionType.OFFLINE
                        && transaction.getStatus() == TransactionStatus.PENDING)
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.TRANSACTION_NOT_FOUND));
    }

    private TransactionModel getPendingTransactionByGatewayOrderCode(OrderModel order, Long gatewayOrderCode) {
        return order.getTransactions().stream()
                .filter(transaction -> transaction.getType() == TransactionType.ONLINE
                        && transaction.getStatus() == TransactionStatus.PENDING
                        && gatewayOrderCode.equals(transaction.getGatewayOrderCode()))
                .findFirst()
                .orElseThrow(() -> new DomainException(ErrorCode.TRANSACTION_NOT_FOUND));
    }

    private TransactionModel getPendingOnlineTransaction(OrderModel order, Long transactionId, PaymentGateway gateway) {
        if (transactionId != null) {
            TransactionModel matchedTransaction = order.getTransactions().stream()
                    .filter(candidate -> transactionId.equals(candidate.getId()))
                    .findFirst()
                    .orElseThrow(() -> new DomainException(ErrorCode.TRANSACTION_NOT_FOUND));

            if (matchedTransaction.getType() != TransactionType.ONLINE) {
                throw new DomainException(ErrorCode.TRANSACTION_NOT_FOUND);
            }
            if (matchedTransaction.getGateway() != null && matchedTransaction.getGateway() != gateway) {
                throw new DomainException(ErrorCode.TRANSACTION_NOT_FOUND);
            }
            if (matchedTransaction.getStatus() != TransactionStatus.PENDING) {
                throw new DomainException(
                        ErrorCode.TRANSACTION_INVALID_STATUS,
                        "Giao dịch không còn ở trạng thái chờ thanh toán."
                );
            }
            return matchedTransaction;
        }

        List<TransactionModel> pendingTransactions = order.getTransactions().stream()
                .filter(transaction -> transaction.getType() == TransactionType.ONLINE
                        && transaction.getStatus() == TransactionStatus.PENDING)
                .toList();

        if (pendingTransactions.size() == 1) {
            TransactionModel transaction = pendingTransactions.getFirst();
            if (transaction.getGateway() == null || transaction.getGateway() == gateway) {
                return transaction;
            }
        }

        throw new DomainException(ErrorCode.TRANSACTION_SELECTION_REQUIRED);
    }

}
