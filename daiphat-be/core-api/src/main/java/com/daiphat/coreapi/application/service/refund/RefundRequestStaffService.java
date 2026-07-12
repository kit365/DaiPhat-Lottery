package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.StaffCancelOrderWithRefundRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.order.TransactionResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundProcessingHistoryItem;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestAdminDetailResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.storage.UploadRequest;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.order.OrderApplicationMapper;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestStaffServicePort;
import com.daiphat.coreapi.application.port.out.file.StoragePort;
import com.daiphat.coreapi.application.port.out.order.OrderDetailSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.order.TransactionRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.application.service.refund.RefundProcessingDeadlineService.ProcessingEvaluation;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.shared.util.PageableUtils;
import com.daiphat.coreapi.shared.util.SortUtils;
import com.daiphat.coreapi.shared.util.StatusCountKeys;
import com.daiphat.coreapi.shared.util.StorageFolderConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundRequestStaffService implements RefundRequestStaffServicePort {

    private static final EnumSet<RefundRequestStatus> EXPIRABLE_STATUSES = EnumSet.of(
            RefundRequestStatus.PENDING,
            RefundRequestStatus.WAITING_FOR_INFO,
            RefundRequestStatus.APPROVED,
            RefundRequestStatus.READY_TO_PAY);

    private static final EnumSet<OrderStatus> STAFF_APPROVABLE_ORDER_STATUSES = EnumSet.of(
            OrderStatus.PAID,
            OrderStatus.PREPARING,
            OrderStatus.PENDING_PICKUP);

    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final OrderDetailSerialRepositoryPort orderDetailSerialRepositoryPort;
    private final UserRepositoryPort userRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final RefundApplicationMapper refundApplicationMapper;
    private final OrderApplicationMapper orderApplicationMapper;
    private final RefundProcessingDeadlineService refundProcessingDeadlineService;
    private final RefundTicketItemResolver refundTicketItemResolver;
    private final StoragePort storagePort;
    private final TransactionRepositoryPort transactionRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<RefundRequestResponse> getRequestsForStaff(
            int page,
            int limit,
            String status,
            UUID orderId,
            String search) {
        List<RefundRequestStatus> statuses = parseStatuses(status);
        RefundRequestStatus singleStatus = statuses != null && statuses.size() == 1
                ? statuses.getFirst()
                : (statuses == null || statuses.isEmpty() ? parseSingleStatus(status) : null);

        Pageable pageable = PageableUtils.of(page, limit, SortUtils.byCreatedAtDesc());
        Page<RefundRequestModel> resultPage = refundRequestRepositoryPort.findAll(
                pageable, null, singleStatus, statuses, orderId, search);

        Map<UUID, String> orderCodesById = new LinkedHashMap<>();
        Page<RefundRequestResponse> mapped = resultPage.map(model -> toEnrichedResponse(
                model,
                loadBankAccount(model.getBankAccountId()),
                resolveOrderCode(model.getOrderId(), orderCodesById)));

        return PageResponse.from(mapped, page, limit, buildStatusCounts(orderId, search));
    }

    @Override
    @Transactional
    public RefundRequestAdminDetailResponse getByIdForStaff(Long id) {
        RefundRequestModel request = getRequestOrThrow(id);
        expireSilentlyIfOverdue(request);

        UserBankAccountModel bankAccount = loadBankAccount(request.getBankAccountId());
        OrderModel order = orderRepositoryPort.findById(requireOrderId(request))
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        UserModel customer = userRepositoryPort.findById(request.getRequestedBy()).orElse(null);
        String reviewerName = resolveUserName(request.getReviewedBy());
        TransactionResponse payoutTransaction = loadPayoutTransaction(request.getOrderId());
        String transferrerName = payoutTransaction != null
                ? resolveUserName(payoutTransaction.paymentBy())
                : null;

        RefundRequestResponse refund = toEnrichedResponse(request, bankAccount, order.getOrderCode(), payoutTransaction);

        RefundRequestAdminDetailResponse.RefundOrderSummary orderSummary =
                new RefundRequestAdminDetailResponse.RefundOrderSummary(
                        order.getId(),
                        order.getOrderCode(),
                        order.getStatus(),
                        order.getTotalAmount(),
                        order.getCreatedAt(),
                        order.getCancelReason());

        RefundRequestAdminDetailResponse.RefundCustomerSummary customerSummary =
                new RefundRequestAdminDetailResponse.RefundCustomerSummary(
                        request.getRequestedBy(),
                        customer != null ? customer.getFullName() : null,
                        customer != null ? customer.getEmail() : null,
                        customer != null ? customer.getPhoneNumber() : null);

        return new RefundRequestAdminDetailResponse(
                refund,
                orderSummary,
                customerSummary,
                reviewerName,
                transferrerName,
                buildProcessingHistory(request, reviewerName, transferrerName, payoutTransaction),
                refundTicketItemResolver.resolveFromOrder(order));
    }

    @Override
    @Transactional
    public RefundRequestResponse approve(Long id, UUID staffId) {
        log.info("Staff {} approving refund request {}", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        ensureProcessable(refund);

        UUID orderId = requireOrderId(refund);
        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!STAFF_APPROVABLE_ORDER_STATUSES.contains(order.getStatus())) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }

        String cancelReason = refund.getRefundReason();
        refund.approve(staffId);
        if (order.isFullyPaid()) {
            refund.setStatus(RefundRequestStatus.READY_TO_PAY);
        }
        cancelOrderForStaffApproval(order, cancelReason);
        releaseSoldTickets(order);

        orderRepositoryPort.save(order);
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);

        publishRefundStatusChanged(saved);
        publishOrderCancelled(order);

        return toEnrichedResponse(saved, loadBankAccount(saved.getBankAccountId()), order.getOrderCode());
    }

    @Override
    @Transactional
    public RefundRequestResponse markTransferred(Long id, UUID staffId, TransferRefundRequestRequest request) {
        log.info("Staff {} marking refund request {} as transferred", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        if (refund.getStatus() == RefundRequestStatus.EXPIRED) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS, "Yêu cầu hoàn tiền đã hết hạn xử lý.");
        }
        if (refund.getBankAccountId() == null) {
            throw new DomainException(
                    ErrorCode.REFUND_REQUEST_INVALID_STATUS,
                    "Yêu cầu hoàn tiền chưa có tài khoản ngân hàng nhận tiền.");
        }
        StorageUtils.validateImageEvidenceUrl(request.paymentEvidenceUrl());

        UUID orderId = requireOrderId(refund);
        refund.markPaid();
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);

        TransactionModel payout = TransactionModel.builder()
                .orderId(orderId)
                .amount(saved.getRefundAmount())
                .type(TransactionType.REFUND)
                .build();
        payout.initializeForCreate();
        payout.markRefundPayoutCompleted(staffId, request.paymentEvidenceUrl(), request.note());
        TransactionModel savedPayout = transactionRepositoryPort.save(payout);

        publishRefundStatusChanged(saved);

        String orderCode = orderRepositoryPort.findById(orderId)
                .map(OrderModel::getOrderCode)
                .orElse(null);
        return toEnrichedResponse(
                saved,
                loadBankAccount(saved.getBankAccountId()),
                orderCode,
                orderApplicationMapper.toTransactionResponse(savedPayout));
    }

    @Override
    @Transactional
    public RefundRequestResponse cancelOrderWithRefund(
            UUID orderId,
            UUID staffId,
            StaffCancelOrderWithRefundRequest request) {
        log.info("Staff {} cancelling order {} with refund (waiting for bank info)", staffId, orderId);

        String cancelReason = request.cancelReason().trim();
        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (!STAFF_APPROVABLE_ORDER_STATUSES.contains(order.getStatus())) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }
        if (refundRequestRepositoryPort.existsLinkedOrderDetailByOrderId(orderId)) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }
        if (order.getUserId() == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Đơn hàng không có khách hàng liên kết.");
        }

        BigDecimal refundAmount = calculateRefundAmount(order);
        cancelOrderForStaffApproval(order, cancelReason);
        releaseSoldTickets(order);
        orderRepositoryPort.save(order);

        RefundRequestModel refundRequest = RefundRequestModel.builder()
                .refundType(RefundType.FULL_ORDER)
                .requestedBy(order.getUserId())
                .requestRole(RefundRequestRole.STAFF)
                .refundAmount(refundAmount)
                .refundReason(cancelReason)
                .build();
        refundRequest.initializeForStaffIncidentCancel();

        RefundRequestModel savedRefund = refundRequestRepositoryPort.save(refundRequest);
        int linked = refundRequestRepositoryPort.linkOrderDetailsByOrderId(orderId, savedRefund.getId());
        if (linked <= 0) {
            throw new DomainException(ErrorCode.REFUND_ORDER_ALREADY_REQUESTED);
        }
        savedRefund.setOrderId(orderId);
        savedRefund.setOrderDetailIds(
                refundRequestRepositoryPort.findOrderDetailIdsByRefundRequestId(savedRefund.getId()));

        publishRefundStatusChanged(savedRefund);
        publishOrderCancelled(order);

        return toEnrichedResponse(savedRefund, null, order.getOrderCode());
    }

    @Override
    @Transactional
    public RefundRequestResponse attachBankAccount(
            Long id,
            UUID staffId,
            AttachRefundBankAccountRequest request) {
        log.info("Staff {} attaching bank account to refund {}", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        UserBankAccountModel bankAccount = userBankAccountRepositoryPort
                .findByIdAndUserId(request.bankAccountId(), refund.getRequestedBy())
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_BANK_ACCOUNT_MISMATCH));

        refund.attachBankAccount(bankAccount.getId());
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
        publishRefundStatusChanged(saved);

        String orderCode = orderRepositoryPort.findById(requireOrderId(saved))
                .map(OrderModel::getOrderCode)
                .orElse(null);
        return toEnrichedResponse(saved, bankAccount, orderCode);
    }

    @Override
    public StorageResult uploadTransferEvidence(UploadRequest request) {
        StorageUtils.validateImageUpload(request);
        return storagePort.upload(new UploadRequest(
                request.data(),
                request.fileName(),
                request.contentType(),
                StorageFolderConstants.REFUND_TRANSFER_EVIDENCE_FOLDER));
    }

    @Override
    @Transactional
    public int expireOverdueRequests() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime createdBefore = refundProcessingDeadlineService.computeExpiryThreshold(now);
        List<RefundRequestModel> candidates = refundRequestRepositoryPort.findExpirableByStatusesAndCreatedBefore(
                EXPIRABLE_STATUSES,
                createdBefore);

        int expiredCount = 0;
        for (RefundRequestModel refund : candidates) {
            if (!refundProcessingDeadlineService.isOverdue(refund)) {
                continue;
            }
            refund.expire();
            RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
            publishRefundStatusChanged(saved);
            expiredCount++;
        }
        return expiredCount;
    }

    private void ensureProcessable(RefundRequestModel refund) {
        expireIfOverdue(refund);
        if (refund.getStatus() != RefundRequestStatus.PENDING) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }
    }

    private void expireIfOverdue(RefundRequestModel refund) {
        if (!expireSilentlyIfOverdue(refund)) {
            return;
        }
        throw new DomainException(
                ErrorCode.REFUND_REQUEST_INVALID_STATUS,
                "Yêu cầu hoàn tiền đã quá hạn xử lý và được đánh dấu hết hạn.");
    }

    private boolean expireSilentlyIfOverdue(RefundRequestModel refund) {
        if (!EXPIRABLE_STATUSES.contains(refund.getStatus())) {
            return false;
        }
        if (!refundProcessingDeadlineService.isOverdue(refund)) {
            return false;
        }
        refund.expire();
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
        publishRefundStatusChanged(saved);
        return true;
    }

    private RefundRequestModel getRequestOrThrow(Long id) {
        return refundRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_NOT_FOUND));
    }

    private UUID requireOrderId(RefundRequestModel refund) {
        UUID orderId = refund.getOrderId();
        if (orderId == null && refund.getId() != null) {
            orderId = refundRequestRepositoryPort.findOrderIdByRefundRequestId(refund.getId()).orElse(null);
            refund.setOrderId(orderId);
        }
        if (orderId == null) {
            throw new DomainException(ErrorCode.ORDER_NOT_FOUND);
        }
        return orderId;
    }

    private RefundRequestResponse toEnrichedResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            String orderCode
    ) {
        return toEnrichedResponse(model, bankAccount, orderCode, loadPayoutTransaction(model.getOrderId()));
    }

    private RefundRequestResponse toEnrichedResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            String orderCode,
            TransactionResponse payoutTransaction
    ) {
        ProcessingEvaluation evaluation = refundProcessingDeadlineService.evaluate(model);
        return refundApplicationMapper.enrichResponse(
                model,
                bankAccount,
                orderCode,
                evaluation.processingDeadlineAt(),
                evaluation.remainingProcessingSeconds(),
                evaluation.processingUrgency(),
                payoutTransaction);
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
        return cache.computeIfAbsent(orderId, id -> orderRepositoryPort.findById(id)
                .map(OrderModel::getOrderCode)
                .orElse(null));
    }

    private void cancelOrderForStaffApproval(OrderModel order, String cancelReason) {
        if (order.getOrderType() == OrderType.DIRECT) {
            order.cancelDirectOrder(cancelReason);
            return;
        }
        if (order.getStatus() == OrderStatus.PAID) {
            order.cancelByCustomerRefund(cancelReason);
            return;
        }
        order.cancelAfterPayment(cancelReason);
    }

    private void releaseSoldTickets(OrderModel order) {
        if (order.getOrderDetails() == null) {
            return;
        }
        for (OrderDetailModel detail : order.getOrderDetails()) {
            List<Long> serialIds = resolveAllocatedSerialIds(detail);
            for (Long serialId : serialIds) {
                lotteryTicketServicePort.returnSoldTicketForOrder(serialId);
            }
        }
    }

    private List<Long> resolveAllocatedSerialIds(OrderDetailModel detail) {
        if (detail.getAllocatedSerialIds() != null && !detail.getAllocatedSerialIds().isEmpty()) {
            return detail.getAllocatedSerialIds();
        }
        if (detail.getId() != null) {
            List<Long> persistedSerialIds = orderDetailSerialRepositoryPort.findSerialIdsByOrderDetailId(detail.getId());
            if (!persistedSerialIds.isEmpty()) {
                return persistedSerialIds;
            }
        }
        if (detail.getLotteryTicketSerialId() != null) {
            return List.of(detail.getLotteryTicketSerialId());
        }
        return List.of();
    }

    private void publishRefundStatusChanged(RefundRequestModel refund) {
        UUID orderId = refund.getOrderId();
        if (orderId == null && refund.getId() != null) {
            orderId = refundRequestRepositoryPort.findOrderIdByRefundRequestId(refund.getId()).orElse(null);
            refund.setOrderId(orderId);
        }
        String orderCode = null;
        if (orderId != null) {
            orderCode = orderRepositoryPort.findById(orderId)
                    .map(OrderModel::getOrderCode)
                    .orElse(null);
        }
        eventPublisher.publishEvent(RefundRequestStatusChangedEvent.builder()
                .refundRequestId(refund.getId())
                .customerId(refund.getRequestedBy())
                .orderId(orderId)
                .orderCode(orderCode)
                .status(refund.getStatus())
                .build());
    }

    private void publishOrderCancelled(OrderModel order) {
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

    private Map<String, Long> buildStatusCounts(UUID orderId, String search) {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put(StatusCountKeys.ALL, refundRequestRepositoryPort.countAll(null, null, null, orderId, search));
        Arrays.stream(RefundRequestStatus.values())
                .forEach(status -> counts.put(
                        status.name(),
                        refundRequestRepositoryPort.countByStatus(status, null, orderId, search)));
        return counts;
    }

    private List<RefundProcessingHistoryItem> buildProcessingHistory(
            RefundRequestModel request,
            String reviewerName,
            String transferrerName,
            TransactionResponse payoutTransaction
    ) {
        List<RefundProcessingHistoryItem> history = new ArrayList<>();

        if (request.getCreatedAt() != null) {
            if (request.getRequestRole() == RefundRequestRole.STAFF
                    || request.getRequestRole() == RefundRequestRole.ADMIN) {
                history.add(new RefundProcessingHistoryItem(
                        "Nhân viên báo lỗi & hủy đơn",
                        request.getRefundReason(),
                        request.getCreatedAt()));
            } else {
                history.add(new RefundProcessingHistoryItem(
                        "Khách hàng tạo yêu cầu",
                        request.getRefundReason(),
                        request.getCreatedAt()));
            }
        }

        if (request.getStatus() == RefundRequestStatus.WAITING_FOR_INFO) {
            history.add(new RefundProcessingHistoryItem(
                    "Chờ thông tin STK",
                    "Đang chờ khách hàng cung cấp tài khoản ngân hàng nhận hoàn tiền.",
                    request.getCreatedAt()));
        } else if (request.getBankAccountId() != null
                && (request.getRequestRole() == RefundRequestRole.STAFF
                || request.getRequestRole() == RefundRequestRole.ADMIN)
                && request.getReviewedAt() == null) {
            history.add(new RefundProcessingHistoryItem(
                    "Đã cung cấp tài khoản ngân hàng",
                    "Yêu cầu chuyển sang chờ chuyển khoản.",
                    request.getUpdatedAt() != null ? request.getUpdatedAt() : request.getCreatedAt()));
        }

        ProcessingEvaluation deadlineEvaluation = refundProcessingDeadlineService.evaluate(request);
        if (deadlineEvaluation.processingDeadlineAt() != null) {
            history.add(new RefundProcessingHistoryItem(
                    "Hạn xử lý",
                    "Hạn chót: " + deadlineEvaluation.processingDeadlineAt(),
                    request.getCreatedAt()));
        }

        if (request.getReviewedAt() != null) {
            if (request.getStatus() == RefundRequestStatus.APPROVED
                    || request.getStatus() == RefundRequestStatus.PAID
                    || request.getStatus() == RefundRequestStatus.READY_TO_PAY) {
                history.add(new RefundProcessingHistoryItem(
                        "Duyệt yêu cầu",
                        reviewerName != null ? "Bởi: " + reviewerName : null,
                        request.getReviewedAt()));
            }
        }

        if (payoutTransaction != null && payoutTransaction.paidAt() != null) {
            String detail = payoutTransaction.note();
            if (transferrerName != null && !transferrerName.isBlank()) {
                detail = (detail != null ? detail + " — " : "") + "Bởi: " + transferrerName;
            }
            history.add(new RefundProcessingHistoryItem(
                    "Đã chuyển khoản",
                    detail,
                    payoutTransaction.paidAt()));
        }

        if (request.getStatus() == RefundRequestStatus.EXPIRED) {
            history.add(new RefundProcessingHistoryItem(
                    "Hết hạn xử lý",
                    "Yêu cầu đã quá hạn xử lý theo cấu hình hệ thống.",
                    request.getUpdatedAt() != null ? request.getUpdatedAt() : LocalDateTime.now()));
        }

        history.sort(Comparator.comparing(
                RefundProcessingHistoryItem::occurredAt,
                Comparator.nullsLast(Comparator.naturalOrder())));
        return history;
    }

    private String resolveUserName(UUID userId) {
        if (userId == null) {
            return null;
        }
        return userRepositoryPort.findById(userId)
                .map(UserModel::getFullName)
                .orElse(null);
    }

    private UserBankAccountModel loadBankAccount(Long bankAccountId) {
        if (bankAccountId == null) {
            return null;
        }
        return userBankAccountRepositoryPort.findById(bankAccountId).orElse(null);
    }

    private RefundRequestStatus parseSingleStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        if (status.contains(",")) {
            return null;
        }
        try {
            return RefundRequestStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
    }

    private List<RefundRequestStatus> parseStatuses(String status) {
        if (status == null || status.isBlank() || !status.contains(",")) {
            return null;
        }
        return Arrays.stream(status.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return RefundRequestStatus.valueOf(s.toUpperCase());
                    } catch (IllegalArgumentException ex) {
                        throw new DomainException(ErrorCode.INVALID_INPUT);
                    }
                })
                .toList();
    }

    private BigDecimal calculateRefundAmount(OrderModel order) {
        if (order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            return order.getOrderDetails().stream()
                    .map(OrderDetailModel::getLineSubtotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        if (order.getTotalAmount() == null || order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_AMOUNT);
        }
        return order.getTotalAmount();
    }
}
