package com.daiphat.coreapi.application.service.order;

import com.daiphat.coreapi.application.dto.order.OrderTicketSnapshot;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.request.order.CreateDirectOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.DirectOrderTransactionRequest;
import com.daiphat.coreapi.application.dto.request.order.CreateOnlineOrderRequest;
import com.daiphat.coreapi.application.dto.request.order.OrderTicketItemRequest;
import com.daiphat.coreapi.application.dto.request.order.ConfirmOrderHandoverRequest;
import com.daiphat.coreapi.application.dto.request.order.OrderHandoverItemRequest;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderDetailAllocatedSerialResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderDetailResponse;
import com.daiphat.coreapi.application.dto.response.order.OrderResponse;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketSerialServicePort;
import com.daiphat.coreapi.application.port.in.order.OrderServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.user.UserLookupServicePort;
import com.daiphat.coreapi.application.port.out.order.PaymentCountdownCachePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService.RefundGraceEvaluation;
import com.daiphat.coreapi.application.service.support.OrderComplaintEligibilityService;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategy;
import com.daiphat.coreapi.application.strategy.payment.PaymentGatewayStrategyFactory;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailHandoverDecision;
import com.daiphat.coreapi.domain.model.enums.order.OrderReceiveType;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionStatus;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionBusinessType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.valueobject.Phone;
import com.daiphat.coreapi.shared.util.DrawScheduleUtils;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService implements OrderServicePort {

    private static final BigDecimal ONLINE_PAYMENT_MIN_AMOUNT = BigDecimal.valueOf(10_000);
    private static final long MAX_PICKUP_LEAD_DAYS = 3;

    private final OrderRepositoryPort orderRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final LotteryTicketSerialServicePort lotteryTicketSerialServicePort;
    private final UserLookupServicePort userLookupServicePort;
    private final OrderApplicationMapper orderApplicationMapper;
    private final PaymentCountdownCachePort paymentCountdownCachePort;
    private final PaymentGatewayStrategyFactory paymentGatewayStrategyFactory;
    private final ApplicationEventPublisher eventPublisher;
    private final OrderRefundGraceService orderRefundGraceService;
    private final PaymentTimeoutConfigService paymentTimeoutConfigService;
    private final OrderComplaintEligibilityService orderComplaintEligibilityService;
    private final StoragePort storagePort;

    @Override
    @Transactional
    public OrderModel createOnlineOrder(CreateOnlineOrderRequest request, UUID customerId) {
        log.info("Creating online order for customer: {}", customerId);

        List<Long> ticketIds = resolveTicketIds(request.items());
        validateTicketIds(ticketIds);
        var customer = userLookupServicePort.findByIdOrThrow(customerId);
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
        order.setEmail(customer.getEmail());
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
        String normalizedPhone = normalizeOptional(request.phone());
        String normalizedEmail = normalizeOptional(request.email());
        ensureDirectOrderContact(normalizedPhone, normalizedEmail);
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
        order.setUserId(request.customerId());
        order.setPhone(normalizedPhone);
        order.setEmail(normalizedEmail);
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
        if (saved.getStatus() == OrderStatus.COMPLETED) {
            publishCustomerOrderStatusChanged(saved);
        }
        log.info("Created direct order with id: {}", saved.getId());
        return saved;
    }

    @Override
    @Transactional
    public void linkGuestOrdersToAccount(UUID userId, String email) {
        if (userId == null || email == null || email.isBlank()) {
            return;
        }
        ensureUserExists(userId);
        orderRepositoryPort.assignGuestOrdersToUserByEmail(userId, email);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderDetail(UUID orderId) {
        return toEnrichedOrderResponse(getOrderOrThrow(orderId));
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getMyOrderDetail(UUID orderId, UUID customerId) {
        ensureUserExists(customerId);
        OrderModel order = getOrderOrThrow(orderId);
        if (order.getUserId() == null || !order.getUserId().equals(customerId)) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }
        return toEnrichedOrderResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(UUID orderId, OrderStatus status, String reason, UUID operatorId) {
        ensureUserExists(operatorId);
        if (status == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }

        OrderModel order = getOrderOrThrow(orderId);
        if (order.getStatus() == status) {
            return orderApplicationMapper.toResponse(order);
        }

        applyOrderStatusTransition(order, status, reason, operatorId);
        OrderModel saved = orderRepositoryPort.save(order);
        clearPendingPaymentCountdownIfResolved(saved);
        publishCustomerOrderStatusChanged(saved);
        return orderApplicationMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public StorageResult uploadHandoverEvidence(UUID orderId, UploadRequest request, UUID operatorId) {
        ensureUserExists(operatorId);
        OrderModel order = getOrderWithLockOrThrow(orderId);
        if (order.getStatus() == OrderStatus.PENDING_PAYMENT || order.getStatus() == OrderStatus.CANCELLED) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
        StorageUtils.validateImageUpload(request);
        StorageResult result = storagePort.upload(new UploadRequest(
                request.data(), request.fileName(), request.contentType(), "orders/handover"));
        order.setHandoverEvidenceUrl(result.url());
        orderRepositoryPort.save(order);
        return result;
    }

    @Override
    @Transactional
    public OrderResponse submitPaymentTimeoutComplaint(UUID orderId, UploadRequest request, UUID customerId) {
        ensureUserExists(customerId);
        OrderModel order = getOrderWithLockOrThrow(orderId);
        if (!customerId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.ACCESS_DENIED);
        }
        StorageUtils.validateImageUpload(request);
        StorageResult proof = storagePort.upload(new UploadRequest(
                request.data(), request.fileName(), request.contentType(), "orders/payment-complaints"));
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        order.submitPaymentTimeoutComplaint(proof.url(), now);
        OrderModel saved = orderRepositoryPort.save(order);
        publishCustomerOrderStatusChanged(saved);
        eventPublisher.publishEvent(new com.daiphat.coreapi.application.event.OrderPaymentComplaintSubmittedEvent(
                saved.getId(), saved.getOrderCode()));
        return toCustomerOrderResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse reviewPaymentTimeoutComplaint(UUID orderId, boolean approved, String reason, UUID operatorId) {
        ensureUserExists(operatorId);
        OrderModel order = getOrderWithLockOrThrow(orderId);
        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));

        if (approved) {
            BigDecimal outstanding = order.getTotalAmount().subtract(order.getCompletedTransactionAmount());
            if (outstanding.signum() <= 0) {
                throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
            }
            TransactionModel verifiedPayment = TransactionModel.builder()
                    .orderId(order.getId())
                    .type(TransactionType.ONLINE)
                    .transactionType(TransactionBusinessType.ORDER_PAYMENT)
                    .amount(outstanding)
                    .build();
            verifiedPayment.initializeForCreate();
            verifiedPayment.markPaymentComplaintVerified(
                    operatorId,
                    order.getPaymentComplaintEvidenceUrl(),
                    "Xác minh thanh toán timeout bởi nhân viên.",
                    now);
            if (order.getTransactions() == null) {
                order.setTransactions(new ArrayList<>());
            }
            order.getTransactions().add(verifiedPayment);
            if (!order.isFullyPaid()) {
                throw new DomainException(ErrorCode.TRANSACTION_INVALID_STATUS);
            }
            order.approvePaymentTimeoutComplaint(now);
            restoreVerifiedTimeoutOrderTickets(order);
            order.setPaymentComplaintResolvedBy(operatorId);
        } else {
            order.rejectPaymentTimeoutComplaint(reason, now);
            order.setPaymentComplaintResolvedBy(operatorId);
        }

        OrderModel saved = orderRepositoryPort.save(order);
        publishCustomerOrderStatusChanged(saved);
        if (approved) {
            eventPublisher.publishEvent(com.daiphat.coreapi.application.event.OrderPaidForProcessingEvent.builder()
                    .orderId(saved.getId()).orderCode(saved.getOrderCode()).build());
        }
        return toEnrichedOrderResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingPaymentTimeoutComplaints() {
        return orderRepositoryPort.countOrdersByStatus(
                OrderStatus.PAYMENT_COMPLAINT_PENDING, List.of(), List.of(), null, null, null);
    }

    @Override
    @Transactional
    public OrderResponse confirmOnlineOrderHandover(
            UUID orderId,
            ConfirmOrderHandoverRequest request,
            UUID operatorId
    ) {
        ensureUserExists(operatorId);
        OrderModel order = getOrderWithLockOrThrow(orderId);
        if (order.getOrderType() != OrderType.ONLINE || order.getStatus() != OrderStatus.PENDING_PICKUP) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }

        Map<Long, OrderDetailModel> detailsById = order.getOrderDetails().stream()
                .filter(detail -> detail.getStatus() == OrderDetailStatus.HANDOVER_IN_PROGRESS)
                .collect(java.util.stream.Collectors.toMap(OrderDetailModel::getId, detail -> detail));
        if (detailsById.size() != request.items().size()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Mỗi vé trong phiếu phải được xác nhận đúng một lần.");
        }

        boolean hasHandedOver = request.items().stream()
                .anyMatch(item -> item.decision() == OrderDetailHandoverDecision.HANDED_OVER);
        String evidenceUrl = normalizeOptional(request.handoverEvidenceUrl());
        if (evidenceUrl != null) {
            StorageUtils.validateImageEvidenceUrl(evidenceUrl);
            order.setHandoverEvidenceUrl(evidenceUrl);
        }
        if (hasHandedOver) {
            StorageUtils.validateImageEvidenceUrl(order.getHandoverEvidenceUrl());
        }

        LocalDateTime now = LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        for (OrderHandoverItemRequest item : request.items()) {
            if (item == null || item.orderDetailId() == null || item.decision() == null) {
                throw new DomainException(ErrorCode.INVALID_INPUT);
            }
            OrderDetailModel detail = detailsById.get(item.orderDetailId());
            if (detail == null || detail.getStatus() != OrderDetailStatus.HANDOVER_IN_PROGRESS) {
                throw new DomainException(ErrorCode.ORDER_DETAIL_INVALID_STATUS);
            }
            if (item.decision() == OrderDetailHandoverDecision.HANDED_OVER) {
                detail.markHandedOver(operatorId, now);
            } else {
                detail.markRejectedByCustomer(item.reason(), operatorId, now);
            }
        }
        order.completeOnlineOrder(operatorId);
        OrderModel saved = orderRepositoryPort.save(order);
        publishCustomerOrderStatusChanged(saved);
        return toEnrichedOrderResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getOrders(
            int page,
            int size,
            List<String> statuses,
            LocalDate fromDate,
            LocalDate toDate,
            List<String> orderTypes,
            List<String> receiveTypes,
            String search,
            String sortBy,
            String direction
    ) {
        validateDateRange(fromDate, toDate);

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        List<OrderStatus> statusEnums = parseOrderStatuses(statuses);
        List<OrderType> orderTypeEnums = parseOrderTypes(orderTypes);
        List<OrderReceiveType> receiveTypeEnums = parseReceiveTypes(receiveTypes);

        Page<OrderResponse> resultPage = orderRepositoryPort.findOrders(
                        pageable,
                        statusEnums,
                        orderTypeEnums,
                        receiveTypeEnums,
                        fromDate,
                        toDate,
                        search
                )
                .map(orderApplicationMapper::toResponse);

        return PageResponse.from(
                resultPage,
                page,
                size,
                buildOrderStatusCounts(orderTypeEnums, receiveTypeEnums, fromDate, toDate, search)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> getMyOrders(
            int page,
            int size,
            List<String> statuses,
            LocalDate fromDate,
            LocalDate toDate,
            List<String> orderTypes,
            String search,
            String sortBy,
            String direction,
            UUID customerId
    ) {
        ensureUserExists(customerId);
        validateDateRange(fromDate, toDate);

        PageRequest pageable = PageRequest.of(
                Math.max(0, page - 1),
                size,
                SortUtils.createSort(sortBy, direction)
        );

        List<OrderStatus> statusEnums = parseOrderStatuses(statuses);
        List<OrderType> orderTypeEnums = parseOrderTypes(orderTypes);
        Page<OrderResponse> resultPage = orderRepositoryPort.findMyOrders(
                        pageable,
                        customerId,
                        statusEnums,
                        orderTypeEnums,
                        fromDate,
                        toDate,
                        search
                )
                .map(this::toCustomerOrderResponse);

        return PageResponse.from(resultPage, page, size, null);
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

    private OrderDetailModel buildOrderDetail(OrderTicketSnapshot ticketSnapshot) {
        OrderDetailModel detail = orderApplicationMapper.toOrderDetailModel(ticketSnapshot);
        detail.initializeForCreate();
        return detail;
    }

    private OrderResponse toEnrichedOrderResponse(OrderModel order) {
        OrderResponse base = orderApplicationMapper.toResponse(order);
        RefundGraceEvaluation refundEvaluation = orderRefundGraceService.evaluate(order);
        return OrderResponse.builder()
                .id(base.id())
                .userId(base.userId())
                .name(base.name())
                .phone(base.phone())
                .email(base.email())
                .orderCode(base.orderCode())
                .orderType(base.orderType())
                .receiveType(base.receiveType())
                .totalAmount(base.totalAmount())
                .status(base.status())
                .expectedPickupAt(base.expectedPickupAt())
                .cancelledAt(base.cancelledAt())
                .cancelReason(base.cancelReason())
                .cancelType(base.cancelType())
                .handoverEvidenceUrl(base.handoverEvidenceUrl())
                .paymentComplaintEvidenceUrl(base.paymentComplaintEvidenceUrl())
                .paymentComplaintSubmittedAt(base.paymentComplaintSubmittedAt())
                .paymentComplaintResolvedAt(base.paymentComplaintResolvedAt())
                .paymentComplaintResolvedBy(base.paymentComplaintResolvedBy())
                .paymentComplaintResolutionReason(base.paymentComplaintResolutionReason())
                .actualPickedUpAt(base.actualPickedUpAt())
                .pickedUpBy(base.pickedUpBy())
                .orderDetails(enrichOrderDetails(order.getOrderDetails()))
                .transactions(base.transactions())
                .createdAt(base.createdAt())
                .updatedAt(base.updatedAt())
                .refundEligible(refundEvaluation.eligible())
                .refundRemainingSeconds(refundEvaluation.remainingSeconds())
                .refundGraceMinutes(refundEvaluation.graceMinutes())
                .refundPaymentSuccessAt(DrawScheduleUtils.toVietnamOffset(refundEvaluation.paymentSuccessAt()))
                .refundDeadlineAt(DrawScheduleUtils.toVietnamOffset(refundEvaluation.refundDeadlineAt()))
                .complaintEligibility(orderComplaintEligibilityService.evaluateOrder(order, LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))))
                .build();
    }

    private OrderResponse toCustomerOrderResponse(OrderModel order) {
        OrderResponse base = orderApplicationMapper.toResponse(order);
        RefundGraceEvaluation refundEvaluation = orderRefundGraceService.evaluate(order);
        return OrderResponse.builder()
                .id(base.id())
                .userId(base.userId())
                .name(base.name())
                .phone(base.phone())
                .email(base.email())
                .orderCode(base.orderCode())
                .orderType(base.orderType())
                .receiveType(base.receiveType())
                .totalAmount(base.totalAmount())
                .status(base.status())
                .expectedPickupAt(base.expectedPickupAt())
                .cancelledAt(base.cancelledAt())
                .cancelReason(base.cancelReason())
                .cancelType(base.cancelType())
                .handoverEvidenceUrl(base.handoverEvidenceUrl())
                .paymentComplaintEvidenceUrl(base.paymentComplaintEvidenceUrl())
                .paymentComplaintSubmittedAt(base.paymentComplaintSubmittedAt())
                .paymentComplaintResolvedAt(base.paymentComplaintResolvedAt())
                .paymentComplaintResolvedBy(base.paymentComplaintResolvedBy())
                .paymentComplaintResolutionReason(base.paymentComplaintResolutionReason())
                .actualPickedUpAt(base.actualPickedUpAt())
                .pickedUpBy(base.pickedUpBy())
                .orderDetails(base.orderDetails())
                .transactions(base.transactions())
                .createdAt(base.createdAt())
                .updatedAt(base.updatedAt())
                .refundEligible(refundEvaluation.eligible())
                .refundRemainingSeconds(refundEvaluation.remainingSeconds())
                .refundGraceMinutes(refundEvaluation.graceMinutes())
                .refundPaymentSuccessAt(DrawScheduleUtils.toVietnamOffset(refundEvaluation.paymentSuccessAt()))
                .refundDeadlineAt(DrawScheduleUtils.toVietnamOffset(refundEvaluation.refundDeadlineAt()))
                .complaintEligibility(orderComplaintEligibilityService.evaluateOrder(order, LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))))
                .build();
    }

    private List<OrderDetailResponse> enrichOrderDetails(List<OrderDetailModel> details) {
        if (details == null || details.isEmpty()) {
            return List.of();
        }

        Map<Long, LotteryTicketResponse> ticketsById = new LinkedHashMap<>();
        Map<Long, LotteryTicketSerialModel> serialsById = new LinkedHashMap<>();

        details.forEach(detail -> {
            Long displaySerialId = detail.isReplaced()
                    ? detail.getReplacedByTicketSerialId()
                    : detail.getLotteryTicketSerialId();
            LotteryTicketSerialModel serial = resolveSerial(displaySerialId, serialsById);
            Long targetTicketId = detail.isReplaced()
                    ? detail.getReplacedByTicketId()
                    : detail.getLotteryTicketId();
            if (targetTicketId == null && serial != null) {
                targetTicketId = serial.getTicketId();
            }
            resolveTicket(targetTicketId, ticketsById);

            List<Long> allocatedIds = detail.getAllocatedSerialIds();
            if (allocatedIds != null) {
                allocatedIds.forEach(id -> resolveSerial(id, serialsById));
            }
        });

        java.util.Set<Long> stationIds = new java.util.LinkedHashSet<>();
        java.util.Set<String> numbersList = new java.util.LinkedHashSet<>();
        java.util.Set<LocalDate> drawDates = new java.util.LinkedHashSet<>();

        for (LotteryTicketResponse t : ticketsById.values()) {
            if (t != null) {
                if (t.stationId() != null) stationIds.add(t.stationId());
                if (t.numbers() != null) numbersList.add(t.numbers());
                if (t.drawDate() != null) drawDates.add(t.drawDate());
            }
        }

        java.util.Set<com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey> availableKeys = new java.util.LinkedHashSet<>();
        if (!stationIds.isEmpty() && !numbersList.isEmpty() && !drawDates.isEmpty()) {
            availableKeys.addAll(lotteryTicketServicePort.findAvailableReplacementsInBulk(stationIds, drawDates, numbersList));
        }

        return details.stream()
                .map(detail -> {
                    Long displaySerialId = detail.isReplaced()
                            ? detail.getReplacedByTicketSerialId()
                            : detail.getLotteryTicketSerialId();
                    LotteryTicketSerialModel serial = resolveSerial(displaySerialId, serialsById);

                    Long displayTicketId = detail.isReplaced()
                            ? detail.getReplacedByTicketId()
                            : detail.getLotteryTicketId();
                    // Fallback: derive ticket id from the serial that will be delivered.
                    if (displayTicketId == null && serial != null) {
                        displayTicketId = serial.getTicketId();
                    }

                    LotteryTicketResponse ticket = resolveTicket(displayTicketId, ticketsById);
                    OrderDetailResponse base = orderApplicationMapper.toDetailResponse(detail);

                    boolean hasRep = false;
                    if (ticket != null && ticket.stationId() != null && ticket.numbers() != null && ticket.drawDate() != null) {
                        hasRep = availableKeys.contains(new com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey(
                                ticket.stationId(), ticket.numbers(), ticket.drawDate()
                        ));
                    }

                    List<Long> allocatedIds = detail.getAllocatedSerialIds() == null
                            ? List.of()
                            : detail.getAllocatedSerialIds().stream().filter(java.util.Objects::nonNull).toList();
                    if (allocatedIds.isEmpty() && displaySerialId != null) {
                        allocatedIds = List.of(displaySerialId);
                    }

                    List<OrderDetailAllocatedSerialResponse> allocatedSerials = allocatedIds.stream()
                            .map(id -> {
                                LotteryTicketSerialModel allocated = resolveSerial(id, serialsById);
                                if (allocated == null) {
                                    return OrderDetailAllocatedSerialResponse.builder()
                                            .id(id)
                                            .build();
                                }
                                return OrderDetailAllocatedSerialResponse.builder()
                                        .id(allocated.getId())
                                        .serialNumber(allocated.getSerialNumber())
                                        .status(allocated.getStatus())
                                        .statusDisplayName(allocated.getStatus() != null
                                                ? allocated.getStatus().getLabel()
                                                : null)
                                        .ticketImg(allocated.getTicketImg())
                                        .ticketId(allocated.getTicketId())
                                        .build();
                            })
                            .toList();

                    return OrderDetailResponse.builder()
                            .id(base.id())
                            .lotteryTicketId(displayTicketId)
                            .lotteryTicketSerialId(displaySerialId)
                            .stationId(ticket != null ? ticket.stationId() : null)
                            .stationName(ticket != null ? ticket.stationName() : null)
                            .numbers(ticket != null ? ticket.numbers() : null)
                            .drawDate(ticket != null ? ticket.drawDate() : null)
                            .ticketImg(serial != null && serial.getTicketImg() != null
                                    ? serial.getTicketImg()
                                    : ticket != null ? ticket.ticketImg() : null)
                            .serialNumber(serial != null ? serial.getSerialNumber() : null)
                            .serialStatus(serial != null ? serial.getStatus() : null)
                            .serialStatusDisplayName(serial != null && serial.getStatus() != null
                                    ? serial.getStatus().getLabel()
                                    : null)
                            .replacedByTicketId(detail.getReplacedByTicketId() != null
                                    ? detail.getReplacedByTicketId()
                                    : (detail.isReplaced() && serial != null ? serial.getTicketId() : null))
                            .replacedByTicketSerialId(base.replacedByTicketSerialId())
                            .price(base.price())
                            .quantity(detail.getEffectiveQuantity())
                            .status(base.status())
                            .rejectionReason(base.rejectionReason())
                            .rejectedAt(base.rejectedAt())
                            .rejectedBy(base.rejectedBy())
                            .handedOverAt(base.handedOverAt())
                            .handedOverBy(base.handedOverBy())
                            .hasReplacement(hasRep)
                            .allocatedSerialIds(allocatedIds)
                            .allocatedSerials(allocatedSerials)
                            .build();
                })
                .toList();
    }

    private LotteryTicketResponse resolveTicket(
            Long lotteryTicketId,
            Map<Long, LotteryTicketResponse> ticketsById
    ) {
        if (lotteryTicketId == null) {
            return null;
        }
        return ticketsById.computeIfAbsent(lotteryTicketId, lotteryTicketServicePort::getById);
    }

    private LotteryTicketSerialModel resolveSerial(
            Long lotteryTicketSerialId,
            Map<Long, LotteryTicketSerialModel> serialsById
    ) {
        if (lotteryTicketSerialId == null) {
            return null;
        }
        return serialsById.computeIfAbsent(lotteryTicketSerialId, lotteryTicketSerialServicePort::getByIdOrThrow);
    }

    private void validateTicketIds(List<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty() || ticketIds.size() > 10) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private void applyOrderStatusTransition(OrderModel order, OrderStatus targetStatus, String reason, UUID operatorId) {
        switch (targetStatus) {
            case PAID -> {
                if (!order.isFullyPaid()) {
                    throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
                }
                order.markPaid();
            }
            case PREPARING -> order.markPreparing();
            case PENDING_PICKUP -> {
                order.markPendingPickup();
            }
            case COMPLETED -> {
                if (order.getOrderType() == OrderType.DIRECT) {
                    order.completeDirectOrder(operatorId);
                } else {
                    order.completeOnlineOrder(operatorId);
                }
            }
            case CANCELLED -> cancelOrderFromAdmin(order, reason);
            case PENDING_PAYMENT, PAYMENT_COMPLAINT_PENDING -> throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
    }


    private void cancelOrderFromAdmin(OrderModel order, String reason) {
        String effectiveReason = reason != null && !reason.isBlank()
                ? reason
                : "Đơn hàng bị hủy bởi quản trị viên.";

        if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
            cancelPendingTransactions(order, effectiveReason);
            releaseReservedTickets(order);
            order.cancelPendingPayment(effectiveReason);
            return;
        }

        if (order.getOrderType() == OrderType.DIRECT) {
            order.cancelDirectOrder(effectiveReason);
            return;
        }

        order.cancelAfterPayment(effectiveReason);
    }

    private void cancelPendingTransactions(OrderModel order, String reason) {
        if (order.getTransactions() == null) {
            return;
        }

        for (TransactionModel transaction : order.getTransactions()) {
            if (transaction.getStatus() != TransactionStatus.PENDING) {
                continue;
            }

            if (transaction.getType() == TransactionType.ONLINE
                    && transaction.getGateway() != null
                    && transaction.getGatewayOrderCode() != null) {
                PaymentGatewayStrategy strategy = paymentGatewayStrategyFactory.getStrategy(transaction.getGateway());
                try {
                    strategy.cancelPayment(order, transaction, reason);
                } catch (DomainException ex) {
                    log.warn("Could not cancel gateway link for admin-cancelled order {} transaction {}: {}",
                            order.getId(), transaction.getId(), ex.getMessage());
                }
            }

            if (transaction.getStatus() == TransactionStatus.PENDING) {
                transaction.markCancelled(reason);
            }
        }
    }

    private void releaseReservedTickets(OrderModel order) {
        if (order.getOrderDetails() == null) {
            return;
        }
        order.getOrderDetails().forEach(detail -> lotteryTicketServicePort.releaseReservationForOrder(detail.getLotteryTicketSerialId()));
    }

    /**
     * A timeout released the serial back to inventory. Once staff verifies the
     * payment proof, atomically consume that same serial again and restore its
     * handover lifecycle. If another order already took it, markSoldForOrder
     * rejects the transaction rather than silently handing over the wrong ticket.
     */
    private void restoreVerifiedTimeoutOrderTickets(OrderModel order) {
        if (order.getOrderDetails() == null) {
            return;
        }
        order.getOrderDetails().forEach(detail -> {
            Long serialId = detail.getReplacedByTicketSerialId() != null
                    ? detail.getReplacedByTicketSerialId()
                    : detail.getLotteryTicketSerialId();
            lotteryTicketServicePort.markSoldForOrder(serialId);
            detail.markProxyHolding();
        });
    }

    private void clearPendingPaymentCountdownIfResolved(OrderModel order) {
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT && order.getId() != null) {
            paymentCountdownCachePort.clear(order.getId());
        }
    }

    private void publishCustomerOrderStatusChanged(OrderModel order) {
        if (order.getId() == null || order.getUserId() == null || order.getStatus() == null) {
            return;
        }

        eventPublisher.publishEvent(OrderStatusChangedEvent.builder()
                .orderId(order.getId())
                .customerId(order.getUserId())
                .orderCode(order.getOrderCode())
                .status(order.getStatus())
                .build());
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

    private void ensureDirectOrderContact(String phone, String email) {
        if (phone == null && email == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Phải nhập ít nhất số điện thoại hoặc email.");
        }
        if (phone != null) {
            ensureValidPhone(phone);
        }
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
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
            paymentCountdownCachePort.start(
                    order.getId(),
                    java.time.Duration.ofSeconds(paymentTimeoutConfigService.getTimeoutSeconds()));
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

    private OrderStatus parseOrderStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return OrderStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
    }

    private OrderType parseOrderType(String orderType) {
        if (orderType == null || orderType.isBlank()) {
            return null;
        }
        try {
            return OrderType.valueOf(orderType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private OrderReceiveType parseReceiveType(String receiveType) {
        if (receiveType == null || receiveType.isBlank()) {
            return null;
        }
        try {
            return OrderReceiveType.valueOf(receiveType.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private List<OrderStatus> parseOrderStatuses(List<String> statuses) {
        return normalizeMultiValues(statuses).stream()
                .map(this::parseOrderStatus)
                .toList();
    }

    private List<OrderType> parseOrderTypes(List<String> orderTypes) {
        return normalizeMultiValues(orderTypes).stream()
                .map(this::parseOrderType)
                .toList();
    }

    private List<OrderReceiveType> parseReceiveTypes(List<String> receiveTypes) {
        return normalizeMultiValues(receiveTypes).stream()
                .map(this::parseReceiveType)
                .toList();
    }

    private List<String> normalizeMultiValues(List<String> rawValues) {
        if (rawValues == null || rawValues.isEmpty()) {
            return List.of();
        }
        return rawValues.stream()
                .filter(value -> value != null && !value.isBlank())
                .flatMap(value -> Arrays.stream(value.split(",")))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toCollection(LinkedHashSet::new),
                        List::copyOf
                ));
    }

    private void validateDateRange(LocalDate fromDate, LocalDate toDate) {
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private OrderModel getOrderOrThrow(UUID orderId) {
        return orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
    }

    private OrderModel getOrderWithLockOrThrow(UUID orderId) {
        return orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
    }

    private Map<String, Long> buildOrderStatusCounts(
            List<OrderType> orderTypes,
            List<OrderReceiveType> receiveTypes,
            LocalDate fromDate,
            LocalDate toDate,
            String search
    ) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("all", orderRepositoryPort.countAllOrders(orderTypes, receiveTypes, fromDate, toDate, search));
        for (OrderStatus status : OrderStatus.values()) {
            counts.put(
                    status.name(),
                    orderRepositoryPort.countOrdersByStatus(status, orderTypes, receiveTypes, fromDate, toDate, search)
            );
        }
        return counts;
    }

}
