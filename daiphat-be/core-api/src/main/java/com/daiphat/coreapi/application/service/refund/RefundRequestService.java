package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.CreateRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.order.TransactionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.service.refund.OrderRefundGraceService;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.shared.util.EnumOptionUtils;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundRequestService implements RefundRequestServicePort {

    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final TransactionRepositoryPort transactionRepositoryPort;
    private final RefundApplicationMapper refundApplicationMapper;
    private final OrderApplicationMapper orderApplicationMapper;
    private final OrderRefundGraceService orderRefundGraceService;
    private final OrderRefundPolicyService orderRefundPolicyService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public RefundRequestResponse create(UUID userId, CreateRefundRequestRequest request) {
        log.info("Creating refund request for customer {} on order {}", userId, request.orderId());

        validateAmount(request.refundAmount());
        validateRefundType(request);

        OrderModel order = orderRepositoryPort.findById(request.orderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!userId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_ACCESS_DENIED);
        }

        orderRefundGraceService.ensureEligible(order);
        orderRefundPolicyService.ensureWithinPolicy(order, userId);

        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_USE_ORDER_REFUND_API);
        }

        validateCustomerFullOrderRefund(request, order);

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), userId)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        RefundRequestModel refundRequest = RefundRequestModel.builder()
                .refundType(RefundType.FULL_ORDER)
                .requestedBy(userId)
                .requestRole(RefundRequestRole.CUSTOMER)
                .refundAmount(request.refundAmount())
                .refundReason(request.refundReason().trim())
                .bankAccountId(bankAccount.getId())
                .build();
        refundRequest.initializeForCreate();

        RefundRequestModel saved = refundRequestRepositoryPort.save(refundRequest);
        int linked = refundRequestRepositoryPort.linkOrderDetailsByOrderId(request.orderId(), saved.getId());
        if (linked <= 0 && order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }
        saved.setOrderId(request.orderId());
        saved.setOrderDetailIds(refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(saved.getId()));
        publishRefundStatusChanged(saved, order.getOrderCode());
        return toResponse(saved, bankAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<RefundRequestResponse> getMyRequests(
            UUID userId, int page, int limit, String status, UUID orderId, String search) {
        return findRequests(page, limit, userId, parseStatus(status), orderId, search);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequestResponse getById(Long id, UUID userId) {
        RefundRequestModel request = getOwnedRequestOrThrow(id, userId);
        return toResponse(request, loadBankAccount(request.getBankAccountId()));
    }

    @Override
    @Transactional
    public RefundRequestResponse cancel(Long id, UUID userId) {
        RefundRequestModel request = getOwnedRequestOrThrow(id, userId);
        if (request.getStatus() != RefundRequestStatus.PENDING) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_CANNOT_CANCEL);
        }
        request.cancel();
        RefundRequestModel saved = refundRequestRepositoryPort.save(request);
        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
    }

    @Override
    @Transactional
    public RefundRequestResponse attachBankAccount(Long id, UUID userId, AttachRefundBankAccountRequest request) {
        RefundRequestModel refund = getOwnedRequestOrThrow(id, userId);
        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), userId)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        refund.attachBankAccount(bankAccount.getId());
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
        publishRefundStatusChanged(saved, resolveOrderCode(saved.getOrderId(), null));
        return toResponse(saved, bankAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnumOptionResponse> getRefundRequestStatuses() {
        return EnumOptionUtils.toEnumOptions(RefundRequestStatus.values());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EnumOptionResponse> getRefundTypes() {
        return EnumOptionUtils.toEnumOptions(RefundType.values());
    }

    private PageResponse<RefundRequestResponse> findRequests(
            int page,
            int limit,
            UUID requestedBy,
            RefundRequestStatus status,
            UUID orderId,
            String search) {
        Pageable pageable = PageableUtils.of(page, limit, SortUtils.byCreatedAtDesc());
        Page<RefundRequestModel> resultPage = refundRequestRepositoryPort.findAll(
                pageable, requestedBy, status, null, orderId, search);

        Map<UUID, String> orderCodesById = new LinkedHashMap<>();
        Page<RefundRequestResponse> mapped = resultPage.map(model -> toResponse(
                model, loadBankAccount(model.getBankAccountId()), orderCodesById));

        return PageResponse.from(
                mapped,
                page,
                limit,
                buildStatusCounts(requestedBy, orderId, search));
    }

    private Map<String, Long> buildStatusCounts(UUID requestedBy, UUID orderId, String search) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, refundRequestRepositoryPort.countAll(requestedBy, null, null, orderId, search));
        Arrays.stream(RefundRequestStatus.values())
                .forEach(status -> counts.put(
                        status.name(),
                        refundRequestRepositoryPort.countByStatus(status, requestedBy, orderId, search)));
        return counts;
    }

    private RefundRequestModel getOwnedRequestOrThrow(Long id, UUID userId) {
        RefundRequestModel request = refundRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_NOT_FOUND));

        if (!userId.equals(request.getRequestedBy())) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_ACCESS_DENIED);
        }
        return request;
    }

    private UserBankAccountModel loadBankAccount(Long bankAccountId) {
        if (bankAccountId == null) {
            return null;
        }
        return userBankAccountRepositoryPort.findById(bankAccountId).orElse(null);
    }

    private RefundRequestResponse toResponse(RefundRequestModel model, UserBankAccountModel bankAccount) {
        return toResponse(model, bankAccount, null);
    }

    private RefundRequestResponse toResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            Map<UUID, String> orderCodesById) {
        String orderCode = resolveOrderCode(model.getOrderId(), orderCodesById);
        TransactionResponse payout = loadPayoutTransaction(model.getOrderId());
        return refundApplicationMapper.enrichResponse(
                model,
                bankAccount,
                orderCode,
                null,
                null,
                null,
                payout);
    }

    private TransactionResponse loadPayoutTransaction(UUID orderId) {
        if (orderId == null) {
            return null;
        }
        return transactionRepositoryPort.findLatestByOrderIdAndType(orderId, TransactionType.REFUND)
                .map(orderApplicationMapper::toTransactionResponse)
                .orElse(null);
    }

    private String resolveOrderCode(UUID orderId, Map<UUID, String> cache) {
        if (orderId == null) {
            return null;
        }
        if (cache != null) {
            return cache.computeIfAbsent(orderId, this::loadOrderCode);
        }
        return loadOrderCode(orderId);
    }

    private String loadOrderCode(UUID orderId) {
        return orderRepositoryPort.findById(orderId)
                .map(OrderModel::getOrderCode)
                .orElse(null);
    }

    private void publishRefundStatusChanged(RefundRequestModel refund, String orderCode) {
        eventPublisher.publishEvent(RefundRequestStatusChangedEvent.builder()
                .refundRequestId(refund.getId())
                .customerId(refund.getRequestedBy())
                .orderId(refund.getOrderId())
                .orderCode(orderCode)
                .status(refund.getStatus())
                .rejectReason(refund.getRejectReason())
                .build());
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }
    }

    private void validateRefundType(CreateRefundRequestRequest request) {
        if (request.refundType() == RefundType.ORDER_DETAIL) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_PARTIAL_NOT_ALLOWED);
        }
        if (request.orderDetailId() != null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private void validateCustomerFullOrderRefund(CreateRefundRequestRequest request, OrderModel order) {
        if (request.refundType() != RefundType.FULL_ORDER) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_PARTIAL_NOT_ALLOWED);
        }

        BigDecimal expectedAmount = calculateOrderRefundAmount(order);
        if (request.refundAmount().compareTo(expectedAmount) != 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }
    }

    private BigDecimal calculateOrderRefundAmount(OrderModel order) {
        if (order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            return order.getOrderDetails().stream()
                    .map(OrderDetailModel::getLineSubtotal)
                    .filter(price -> price != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        return order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
    }

    private RefundRequestStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return RefundRequestStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }
}
