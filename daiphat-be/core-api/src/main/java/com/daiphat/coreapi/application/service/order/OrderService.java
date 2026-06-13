package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.valueobject.Phone;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService implements OrderServicePort {

    private final OrderRepositoryPort orderRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final UserLookupServicePort userLookupServicePort;
    private final OrderApplicationMapper orderApplicationMapper;

    @Override
    @Transactional
    public OrderModel createOnlineOrder(CreateOnlineOrderRequest request, UUID customerId) {
        log.info("Creating online order for customer: {}", customerId);

        validateTicketIds(request.lotteryTicketIds());
        ensureUserExists(customerId);
        ensureValidPhone(request.phone());
        ensureValidPickupTime(request.expectedPickupAt());

        List<OrderDetailModel> orderDetails = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Long ticketId : request.lotteryTicketIds()) {
            OrderTicketSnapshot ticketSnapshot = lotteryTicketServicePort.reserveForOrder(ticketId);
            orderDetails.add(buildOrderDetail(ticketSnapshot));
            totalAmount = totalAmount.add(ticketSnapshot.price());
        }

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
        log.info("Created online order with id: {}", saved.getId());
        return saved;
    }

    @Override
    @Transactional
    public OrderModel createDirectOrder(CreateDirectOrderRequest request, UUID operatorId) {
        log.info("Creating direct order");

        validateTicketIds(request.lotteryTicketIds());
        ensureUserExistsIfPresent(request.customerId());
        ensureUserExists(operatorId);
        ensureValidPhone(request.phone());

        List<OrderDetailModel> orderDetails = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (Long ticketId : request.lotteryTicketIds()) {
            OrderTicketSnapshot ticketSnapshot = lotteryTicketServicePort.sellOfflineForOrder(ticketId);
            orderDetails.add(buildOrderDetail(ticketSnapshot));
            totalAmount = totalAmount.add(ticketSnapshot.price());
        }

        TransactionModel transaction = orderApplicationMapper.toDirectTransactionModel(totalAmount, request.note());
        transaction.initializeForCreate();
        transaction.collectCash(operatorId);

        OrderModel order = orderApplicationMapper.toDirectOrderModel(request);
        order.setOrderCode(generateOrderCode());
        order.setReceiveType(resolveReceiveType(request.receiveType()));
        order.setTotalAmount(totalAmount);
        order.setOrderDetails(orderDetails);
        order.setTransactions(List.of(transaction));
        order.initializeForCreate();
        order.markPaid();
        order.completeDirectOrder(operatorId);

        OrderModel saved = orderRepositoryPort.save(order);
        log.info("Created direct order with id: {}", saved.getId());
        return saved;
    }

    private OrderDetailModel buildOrderDetail(OrderTicketSnapshot ticketSnapshot) {
        OrderDetailModel detail = orderApplicationMapper.toOrderDetailModel(ticketSnapshot);
        detail.initializeForCreate();
        return detail;
    }

    private void validateTicketIds(List<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private void ensureUserExists(UUID userId) {
        userLookupServicePort.findByIdOrThrow(userId);
    }

    private void ensureUserExistsIfPresent(UUID userId) {
        if (userId != null) {
            ensureUserExists(userId);
        }
    }

    private void ensureValidPickupTime(LocalDateTime expectedPickupAt) {
        if (expectedPickupAt == null || expectedPickupAt.isBefore(LocalDateTime.now().plusMinutes(15))) {
            throw new DomainException(ErrorCode.INVALID_PICKUP_TIME);
        }
    }

    private void ensureValidPhone(String phone) {
        Phone.of(phone);
    }

    private OrderReceiveType resolveReceiveType(OrderReceiveType receiveType) {
        return receiveType != null ? receiveType : OrderReceiveType.COUNTER_PICKUP;
    }

    private String generateOrderCode() {
        final int maxRetries = 5;
        for (int i = 0; i < maxRetries; i++) {
            String orderCode = "ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            if (!orderRepositoryPort.existsByOrderCode(orderCode)) {
                return orderCode;
            }
        }
        throw new DomainException(ErrorCode.ORDER_CODE_GENERATION_FAILED);
    }
}
