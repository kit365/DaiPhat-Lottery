package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.DirectOrderTransactionRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.OrderTicketItemRequest;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.refund.OrderRefundStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.valueobject.Phone;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService implements OrderServicePort {

    private static final BigDecimal ONLINE_PAYMENT_MIN_AMOUNT = BigDecimal.valueOf(10_000);
    private static final long MAX_PICKUP_LEAD_DAYS = 3;

    @Value("${daiphat.order.pending-payment-ttl-seconds:600}")
    private long pendingPaymentTtlSeconds;

    private final OrderRepositoryPort orderRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final UserLookupServicePort userLookupServicePort;
    private final OrderApplicationMapper orderApplicationMapper;
    private final PaymentCountdownCachePort paymentCountdownCachePort;

    @Override
    @Transactional
    public OrderModel createOnlineOrder(CreateOnlineOrderRequest request, UUID customerId) {
        log.info("Creating online order for customer: {}", customerId);

        List<Long> ticketIds = resolveTicketIds(request.items());
        validateTicketIds(ticketIds);
        ensureUserExists(customerId);
        ensureValidPhone(request.phone());
        List<OrderDetailModel> orderDetails = new ArrayList<>();
        List<OrderTicketSnapshot> ticketSnapshots = lotteryTicketServicePort.reserveForOrder(ticketIds);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderTicketSnapshot ticketSnapshot : ticketSnapshots) {
            orderDetails.add(buildOrderDetail(ticketSnapshot));
            totalAmount = totalAmount.add(ticketSnapshot.price());
        }

        ensureValidPickupTime(request.expectedPickupAt(), ticketSnapshots);

        TransactionModel transaction = orderApplicationMapper.toOnlineTransactionModel(totalAmount, request.note());
        transaction.initializeForCreate();

        OrderModel order = orderApplicationMapper.toOnlineOrderModel(request);
        order.setUserId(customerId);
        order.setOrderCode(generateOrderCode());
        order.setReceiveType(resolveReceiveType(request.receiveType()));
        order.setTotalAmount(totalAmount);
        order.setOrderDetails(orderDetails);
        order.setTransactions(List.of(transaction));
        order.initializeForCreate();

        OrderModel saved = orderRepositoryPort.save(order);
        registerPendingPaymentCountdown(saved);
        log.info("Created online order with id: {}", saved.getId());
        return saved;
    }

    @Override
    @Transactional
    public OrderModel createDirectOrder(CreateDirectOrderRequest request, UUID operatorId) {
        log.info("Creating direct order");

        List<Long> ticketIds = resolveTicketIds(request.items());
        validateTicketIds(ticketIds);
        ensureUserExistsIfPresent(request.customerId());
        ensureUserExists(operatorId);
        ensureValidPhone(request.phone());
        boolean hasPendingOnlinePayment = hasPendingOnlinePayment(request);

        List<OrderDetailModel> orderDetails = new ArrayList<>();
        List<OrderTicketSnapshot> ticketSnapshots = hasPendingOnlinePayment
                ? lotteryTicketServicePort.reserveForOrder(ticketIds)
                : lotteryTicketServicePort.sellOfflineForOrder(ticketIds);
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderTicketSnapshot ticketSnapshot : ticketSnapshots) {
            orderDetails.add(buildOrderDetail(ticketSnapshot));
            totalAmount = totalAmount.add(ticketSnapshot.price());
        }

        List<TransactionModel> transactions = buildDirectTransactions(request, totalAmount, operatorId);

        OrderModel order = orderApplicationMapper.toDirectOrderModel(request);
        order.setOrderCode(generateOrderCode());
        order.setReceiveType(resolveReceiveType(request.receiveType()));
        order.setTotalAmount(totalAmount);
        order.setOrderDetails(orderDetails);
        order.setTransactions(transactions);
        order.initializeForCreate();
        if (order.isFullyPaid()) {
            order.markPaid();
            order.completeDirectOrder(operatorId);
        }

        OrderModel saved = orderRepositoryPort.save(order);
        registerPendingPaymentCountdown(saved);
        log.info("Created direct order with id: {}", saved.getId());
        return saved;
    }

    @Override
    public List<EnumOptionResponse> getOrderTypes() {
        return EnumOptionUtils.toEnumOptions(OrderType.values());
    }

    @Override
    public List<EnumOptionResponse> getOrderStatuses() {
        return EnumOptionUtils.toEnumOptions(OrderStatus.values());
    }

    @Override
    public List<EnumOptionResponse> getOrderReceiveTypes() {
        return EnumOptionUtils.toEnumOptions(OrderReceiveType.values());
    }

    @Override
    public List<EnumOptionResponse> getOrderDetailStatuses() {
        return EnumOptionUtils.toEnumOptions(OrderDetailStatus.values());
    }

    @Override
    public List<EnumOptionResponse> getOrderRefundStatuses() {
        return EnumOptionUtils.toEnumOptions(OrderRefundStatus.values());
    }

    private OrderDetailModel buildOrderDetail(OrderTicketSnapshot ticketSnapshot) {
        OrderDetailModel detail = orderApplicationMapper.toOrderDetailModel(ticketSnapshot);
        detail.initializeForCreate();
        return detail;
    }

    private void validateTicketIds(List<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty() || ticketIds.size() > 10) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private List<Long> resolveTicketIds(List<OrderTicketItemRequest> items) {
        List<Long> resolvedTicketIds = new ArrayList<>();
        for (OrderTicketItemRequest item : items) {
            if (item == null
                    || item.lotteryTicketId() == null
                    || item.quantity() == null
                    || item.quantity() <= 0) {
                throw new DomainException(ErrorCode.INVALID_INPUT);
            }
            for (int i = 0; i < item.quantity(); i++) {
                resolvedTicketIds.add(item.lotteryTicketId());
            }
        }
        return resolvedTicketIds;
    }

    private void ensureUserExists(UUID userId) {
        userLookupServicePort.findByIdOrThrow(userId);
    }

    private void ensureUserExistsIfPresent(UUID userId) {
        if (userId != null) {
            ensureUserExists(userId);
        }
    }

    private void ensureValidPickupTime(LocalDateTime expectedPickupAt, List<OrderTicketSnapshot> ticketSnapshots) {
        if (expectedPickupAt == null || expectedPickupAt.isBefore(LocalDateTime.now().plusMinutes(15))) {
            throw new DomainException(ErrorCode.INVALID_PICKUP_TIME);
        }

        LocalDate earliestDrawDate = ticketSnapshots.stream()
                .map(OrderTicketSnapshot::drawDate)
                .filter(java.util.Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(null);
        if (earliestDrawDate == null) {
            throw new DomainException(ErrorCode.INVALID_PICKUP_TIME);
        }

        LocalDate pickupDate = expectedPickupAt.toLocalDate();
        LocalDate earliestAllowedPickupDate = earliestDrawDate.minusDays(MAX_PICKUP_LEAD_DAYS);
        if (pickupDate.isBefore(earliestAllowedPickupDate) || pickupDate.isAfter(earliestDrawDate)) {
            throw new DomainException(ErrorCode.INVALID_PICKUP_TIME);
        }
    }

    private void ensureValidPhone(String phone) {
        Phone.of(phone);
    }

    private List<TransactionModel> buildDirectTransactions(CreateDirectOrderRequest request, BigDecimal totalAmount, UUID operatorId) {
        List<DirectOrderTransactionRequest> paymentRequests = request.transactions();
        if (paymentRequests == null || paymentRequests.isEmpty()) {
            paymentRequests = List.of(new DirectOrderTransactionRequest(TransactionType.OFFLINE, totalAmount, request.note()));
        }

        List<TransactionModel> transactions = new ArrayList<>();
        BigDecimal paidAmount = BigDecimal.ZERO;
        for (DirectOrderTransactionRequest paymentRequest : paymentRequests) {
            validateDirectTransaction(paymentRequest);

            TransactionModel transaction = orderApplicationMapper.toDirectTransactionModel(
                    paymentRequest.type(),
                    paymentRequest.amount(),
                    resolveTransactionNote(paymentRequest.note(), request.note())
            );
            transaction.initializeForCreate();
            if (paymentRequest.type() == TransactionType.OFFLINE) {
                transaction.markDirectPaymentCompleted(operatorId);
            }
            transactions.add(transaction);
            paidAmount = paidAmount.add(paymentRequest.amount());
        }

        if (paidAmount.compareTo(totalAmount) != 0) {
            throw new DomainException(ErrorCode.INVALID_TRANSACTION_AMOUNT);
        }
        return transactions;
    }

    private void validateDirectTransaction(DirectOrderTransactionRequest paymentRequest) {
        if (paymentRequest == null
                || paymentRequest.type() == null
                || paymentRequest.amount() == null
                || paymentRequest.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.INVALID_TRANSACTION_AMOUNT);
        }
        if (paymentRequest.type() == TransactionType.ONLINE
                && paymentRequest.amount().compareTo(ONLINE_PAYMENT_MIN_AMOUNT) < 0) {
            throw new DomainException(ErrorCode.ONLINE_PAYMENT_MIN_AMOUNT);
        }
    }

    private String resolveTransactionNote(String transactionNote, String orderNote) {
        return transactionNote != null && !transactionNote.isBlank() ? transactionNote : orderNote;
    }

    private void registerPendingPaymentCountdown(OrderModel order) {
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT && order.getId() != null) {
            paymentCountdownCachePort.start(order.getId(), java.time.Duration.ofSeconds(pendingPaymentTtlSeconds));
            return;
        }
        if (order.getId() != null) {
            paymentCountdownCachePort.clear(order.getId());
        }
    }

    private boolean hasPendingOnlinePayment(CreateDirectOrderRequest request) {
        List<DirectOrderTransactionRequest> paymentRequests = request.transactions();
        if (paymentRequests == null || paymentRequests.isEmpty()) {
            return false;
        }
        return paymentRequests.stream()
                .filter(paymentRequest -> paymentRequest != null && paymentRequest.type() != null)
                .anyMatch(paymentRequest -> paymentRequest.type() == TransactionType.ONLINE);
    }

    private OrderReceiveType resolveReceiveType(OrderReceiveType receiveType) {
        return receiveType != null ? receiveType : OrderReceiveType.COUNTER_PICKUP;
    }

    private String generateOrderCode() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        final int maxRetries = 5;
        for (int i = 0; i < maxRetries; i++) {
            String suffix = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            String orderCode = "ORD-" + date + "-" + suffix;
            if (!orderRepositoryPort.existsByOrderCode(orderCode)) {
                return orderCode;
            }
        }
        throw new DomainException(ErrorCode.ORDER_CODE_GENERATION_FAILED);
    }

}
