package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.CreateRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.RejectRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
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
    private final RefundApplicationMapper refundApplicationMapper;

    @Override
    @Transactional
    public RefundRequestResponse create(UUID userId, CreateRefundRequestRequest request) {
        log.info("Creating refund request for user {} on order {}", userId, request.orderId());

        validateAmount(request.refundAmount());
        validateRefundType(request);

        OrderModel order = orderRepositoryPort.findById(request.orderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!userId.equals(order.getUserId())) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_ACCESS_DENIED);
        }

        validateOrderDetail(request, order);

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), userId)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        RefundRequestModel refundRequest = RefundRequestModel.builder()
                .refundType(request.refundType())
                .orderId(request.orderId())
                .orderDetailId(request.orderDetailId())
                .requestedBy(userId)
                .requestRole(RefundRequestRole.CUSTOMER)
                .refundAmount(request.refundAmount())
                .refundReason(request.refundReason().trim())
                .bankAccountId(bankAccount.getId())
                .build();
        refundRequest.initializeForCreate();

        RefundRequestModel saved = refundRequestRepositoryPort.save(refundRequest);
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
    public PageResponse<RefundRequestResponse> getAll(
            int page, int limit, String status, UUID orderId, String search) {
        return findRequests(page, limit, null, parseStatus(status), orderId, search);
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequestResponse getById(Long id, UUID userId, boolean staffAccess) {
        RefundRequestModel request = refundRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_NOT_FOUND));

        if (!staffAccess && !userId.equals(request.getRequestedBy())) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_ACCESS_DENIED);
        }

        UserBankAccountModel bankAccount = userBankAccountRepositoryPort.findById(request.getBankAccountId())
                .orElse(null);
        return toResponse(request, bankAccount);
    }

    @Override
    @Transactional
    public RefundRequestResponse approve(Long id, UUID reviewerId) {
        RefundRequestModel request = getRequestOrThrow(id);
        request.approve(reviewerId);
        RefundRequestModel saved = refundRequestRepositoryPort.save(request);
        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
    }

    @Override
    @Transactional
    public RefundRequestResponse reject(Long id, UUID reviewerId, RejectRefundRequestRequest rejectRequest) {
        RefundRequestModel request = getRequestOrThrow(id);
        request.reject(reviewerId, rejectRequest.rejectReason());
        RefundRequestModel saved = refundRequestRepositoryPort.save(request);
        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
    }

    @Override
    @Transactional
    public RefundRequestResponse markTransferred(
            Long id, UUID transferrerId, TransferRefundRequestRequest transferRequest) {
        RefundRequestModel request = getRequestOrThrow(id);
        request.markTransferred(transferrerId, transferRequest.transferEvidenceUrl());
        RefundRequestModel saved = refundRequestRepositoryPort.save(request);
        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
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
                pageable, requestedBy, status, orderId, search);

        Page<RefundRequestResponse> mapped = resultPage.map(model -> toResponse(
                model, loadBankAccount(model.getBankAccountId())));

        return PageResponse.from(
                mapped,
                page,
                limit,
                buildStatusCounts(requestedBy, orderId, search));
    }

    private Map<String, Long> buildStatusCounts(UUID requestedBy, UUID orderId, String search) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, refundRequestRepositoryPort.countAll(requestedBy, null, orderId, search));
        Arrays.stream(RefundRequestStatus.values())
                .forEach(status -> counts.put(
                        status.name(),
                        refundRequestRepositoryPort.countByStatus(status, requestedBy, orderId, search)));
        return counts;
    }

    private RefundRequestModel getRequestOrThrow(Long id) {
        return refundRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_NOT_FOUND));
    }

    private UserBankAccountModel loadBankAccount(Long bankAccountId) {
        return userBankAccountRepositoryPort.findById(bankAccountId).orElse(null);
    }

    private RefundRequestResponse toResponse(RefundRequestModel model, UserBankAccountModel bankAccount) {
        return refundApplicationMapper.toRefundResponse(model, bankAccount);
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }
    }

    private void validateRefundType(CreateRefundRequestRequest request) {
        if (request.refundType() == RefundType.ORDER_DETAIL && request.orderDetailId() == null) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_ORDER_DETAIL_REQUIRED);
        }
        if (request.refundType() == RefundType.FULL_ORDER && request.orderDetailId() != null) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private void validateOrderDetail(CreateRefundRequestRequest request, OrderModel order) {
        if (request.orderDetailId() == null) {
            return;
        }

        boolean detailBelongsToOrder = order.getOrderDetails() != null
                && order.getOrderDetails().stream()
                        .map(OrderDetailModel::getId)
                        .anyMatch(id -> id.equals(request.orderDetailId()));

        if (!detailBelongsToOrder) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_ORDER_MISMATCH);
        }
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
