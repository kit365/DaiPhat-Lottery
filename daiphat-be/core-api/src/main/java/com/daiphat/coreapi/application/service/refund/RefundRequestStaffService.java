package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.AttachRefundBankAccountRequest;
import com.daiphat.coreapi.application.dto.request.refund.RequestBankInfoUpdateRequest;
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
import com.daiphat.coreapi.application.port.out.settings.SystemConfigRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.application.service.refund.RefundProcessingDeadlineService.ProcessingEvaluation;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.detail.OrderDetailStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestRole;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundType;
import com.daiphat.coreapi.domain.model.enums.settings.SystemConfigEnum;
import com.daiphat.coreapi.domain.model.enums.transaction.TransactionType;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.orders.TransactionModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
import com.daiphat.coreapi.domain.model.settings.SystemConfigModel;
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
    private final SystemConfigRepositoryPort systemConfigRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;
    private final com.daiphat.coreapi.application.port.in.order.OrderIncidentTicketServicePort orderIncidentTicketServicePort;

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

        UserBankAccountModel bankAccount = loadBankAccount(request.getBankAccountId());
        UUID orderId = resolveOrderId(request);
        OrderModel order = orderId != null
                ? orderRepositoryPort.findById(orderId).orElse(null)
                : null;

        UserModel customer = userRepositoryPort.findById(request.getRequestedBy()).orElse(null);
        String reviewerName = resolveUserName(request.getReviewedBy());
        TransactionResponse payoutTransaction = loadPayoutTransaction(request);
        String transferrerName = payoutTransaction != null
                ? resolveUserName(payoutTransaction.paymentBy())
                : null;

        String orderCode = order != null ? order.getOrderCode() : null;
        RefundRequestResponse refund = toEnrichedResponse(request, bankAccount, orderCode, payoutTransaction);

        RefundRequestAdminDetailResponse.RefundOrderSummary orderSummary = order == null
                ? null
                : new RefundRequestAdminDetailResponse.RefundOrderSummary(
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
                order != null ? refundTicketItemResolver.resolveFromOrder(order) : List.of());
    }

    @Override
    @Transactional
    public RefundRequestResponse markTransferred(Long id, UUID staffId, TransferRefundRequestRequest request) {
        log.info("Staff {} marking refund request {} as transferred", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        if (refund.getBankAccountId() == null) {
            throw new DomainException(
                    ErrorCode.REFUND_REQUEST_INVALID_STATUS,
                    "Yêu cầu hoàn tiền chưa có tài khoản ngân hàng nhận tiền.");
        }
        StorageUtils.validateImageEvidenceUrl(request.paymentEvidenceUrl());

        UUID orderId = requireOrderId(refund);
        refund.markPaid();
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);

        OrderModel order = orderRepositoryPort.findById(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));
        markOrderDetailsRefunded(order, saved.getId());
        orderRepositoryPort.save(order);

        String payoutNote = buildRefundPayoutNote(staffId);
        TransactionModel payout = TransactionModel.builder()
                .refundRequestId(saved.getId())
                .amount(saved.getRefundAmount())
                .type(TransactionType.REFUND)
                .build();
        payout.initializeForCreate();
        payout.markRefundPayoutCompleted(staffId, request.paymentEvidenceUrl(), payoutNote);
        TransactionModel savedPayout = transactionRepositoryPort.save(payout);

        publishRefundStatusChanged(saved);

        return toEnrichedResponse(
                saved,
                loadBankAccount(saved.getBankAccountId()),
                order.getOrderCode(),
                orderApplicationMapper.toTransactionResponse(savedPayout));
    }

    private void markOrderDetailsRefunded(OrderModel order, Long refundRequestId) {
        if (order.getOrderDetails() == null || refundRequestId == null) {
            return;
        }
        for (OrderDetailModel detail : order.getOrderDetails()) {
            if (!refundRequestId.equals(detail.getRefundRequestId())) {
                continue;
            }
            // Partial-inspection refunds may still be ACTIVE if an older orphan row was repaired.
            if (detail.getStatus() == OrderDetailStatus.ACTIVE) {
                detail.markRefundPending();
            }
            detail.markRefunded();
        }
    }

    @Override
    @Transactional
    public RefundRequestResponse requestBankInfoUpdate(
            Long id, UUID staffId, RequestBankInfoUpdateRequest request) {
        log.info("Staff {} requesting bank info update for refund {}", staffId, id);

        // Bank-info correction only: no payout Transaction and no transfer evidence.
        RefundRequestModel refund = getRequestOrThrow(id);
        int maxRetry = getMaxRefundBankInfoRetry();
        refund.requestBankInfoCorrection(request.operatorNote(), maxRetry);
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
        publishRefundStatusChanged(saved);

        return toEnrichedResponse(
                saved,
                loadBankAccount(saved.getBankAccountId()),
                resolveOrderCode(resolveOrderId(saved), new LinkedHashMap<>()));
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

    private RefundRequestModel getRequestOrThrow(Long id) {
        return refundRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_NOT_FOUND));
    }

    private UUID requireOrderId(RefundRequestModel refund) {
        UUID orderId = resolveOrderId(refund);
        if (orderId == null) {
            throw new DomainException(
                    ErrorCode.ORDER_NOT_FOUND,
                    "Yêu cầu hoàn tiền chưa được gắn với đơn hàng (thiếu liên kết order_details). "
                            + "Với hoàn tiền từng phần sau kiểm tra vé, vui lòng tạo lại yêu cầu hoặc gắn lại các vé sự cố vào yêu cầu.");
        }
        return orderId;
    }

    private UUID resolveOrderId(RefundRequestModel refund) {
        UUID orderId = refund.getOrderId();
        if (orderId == null && refund.getId() != null) {
            orderId = refundRequestRepositoryPort.findOrderIdByRefundRequestId(refund.getId()).orElse(null);
            refund.setOrderId(orderId);
        }
        return orderId;
    }

    private RefundRequestResponse toEnrichedResponse(
            RefundRequestModel model,
            UserBankAccountModel bankAccount,
            String orderCode
    ) {
        return toEnrichedResponse(model, bankAccount, orderCode, loadPayoutTransaction(model));
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
                payoutTransaction,
                getMaxRefundBankInfoRetry());
    }

    private int getMaxRefundBankInfoRetry() {
        String fallback = SystemConfigEnum.MAX_REFUND_BANK_INFO_RETRY.getDefaultValue();
        String raw = systemConfigRepositoryPort
                .findActiveByConfigKey(SystemConfigEnum.MAX_REFUND_BANK_INFO_RETRY.name())
                .map(SystemConfigModel::getConfigValue)
                .orElse(fallback);
        try {
            int value = Integer.parseInt(raw.trim());
            return value > 0 ? value : Integer.parseInt(fallback);
        } catch (NumberFormatException ex) {
            return Integer.parseInt(fallback);
        }
    }

    private TransactionResponse loadPayoutTransaction(RefundRequestModel refund) {
        if (refund == null || refund.getId() == null) {
            return null;
        }
        return transactionRepositoryPort.findLatestByRefundRequestId(refund.getId())
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
            order.cancelDirectOrderForRefund(cancelReason);
            return;
        }
        if (order.getStatus() == OrderStatus.PAID) {
            order.cancelByCustomerRefund(cancelReason);
            return;
        }
        order.cancelAfterPaymentForRefund(cancelReason);
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
                .retryCount(refund.getRetryCount())
                .refundType(refund.getRefundType())
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
            String waitingDetail = request.getRetryCount() > 0 && request.getOperatorNote() != null
                    ? request.getOperatorNote()
                    : "Đang chờ khách hàng cung cấp tài khoản ngân hàng nhận hoàn tiền.";
            history.add(new RefundProcessingHistoryItem(
                    "Chờ thông tin STK",
                    waitingDetail,
                    request.getUpdatedAt() != null ? request.getUpdatedAt() : request.getCreatedAt()));
        } else if (request.getStatus() == RefundRequestStatus.MANUAL_RESOLUTION) {
            history.add(new RefundProcessingHistoryItem(
                    "Cần xử lý thủ công",
                    request.getOperatorNote(),
                    request.getUpdatedAt() != null ? request.getUpdatedAt() : request.getCreatedAt()));
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
                        "Tiếp nhận xử lý",
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

        history.sort(Comparator.comparing(
                RefundProcessingHistoryItem::occurredAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
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

    private String buildRefundPayoutNote(UUID staffId) {
        String employeeName = resolveUserName(staffId);
        if (employeeName == null || employeeName.isBlank()) {
            employeeName = "không xác định";
        }
        return "Yêu cầu hoàn tiền đã được xử lý chuyển khoản bởi nhân viên " + employeeName.trim() + ".";
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

    @Override
    @Transactional
    public RefundRequestResponse createPartialRefund(
            UUID orderId,
            UUID staffId,
            com.daiphat.coreapi.application.dto.request.order.CreatePartialRefundRequest request
    ) {
        log.info("Staff {} creating partial refund for order {}", staffId, orderId);

        OrderModel order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new DomainException(
                    ErrorCode.ORDER_INVALID_STATUS,
                    "Chỉ được xử lý hoàn tiền từng phần khi đơn đang ở trạng thái PREPARING.");
        }

        // Handle incidents (replacements / no-replacement outcomes)
        com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse incidentResponse =
                orderIncidentTicketServicePort.handlePartialRefundIncidents(orderId, staffId, request.incidents(), request.refundNote());

        // Reload after incident handling so we don't overwrite detail/serial changes with a stale order snapshot.
        order = orderRepositoryPort.findByIdWithLock(orderId)
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        boolean hasNoReplacement = incidentResponse.results().stream()
                .anyMatch(r -> r.outcome() == com.daiphat.coreapi.domain.model.enums.order.TicketIncidentOutcome.NO_REPLACEMENT);

        RefundRequestModel createdRefund = null;
        if (hasNoReplacement) {
            // Check if refund request already exists (linked via order_details)
            List<RefundRequestModel> existingRefunds = refundRequestRepositoryPort.findAll(
                    org.springframework.data.domain.PageRequest.of(0, 1), null, null, null, orderId, null).getContent();
            if (existingRefunds.isEmpty()) {
                BigDecimal refundAmount = BigDecimal.ZERO;
                List<Long> noReplacementDetailIds = new ArrayList<>();

                for (com.daiphat.coreapi.application.dto.response.order.HandleOrderTicketIncidentResponse.TicketIncidentItemResult res
                        : incidentResponse.results()) {
                    if (res.outcome() != com.daiphat.coreapi.domain.model.enums.order.TicketIncidentOutcome.NO_REPLACEMENT) {
                        continue;
                    }
                    OrderDetailModel detail = order.getOrderDetails().stream()
                            .filter(d -> d.getId().equals(res.orderDetailId()))
                            .findFirst()
                            .orElse(null);
                    if (detail == null) {
                        continue;
                    }
                    noReplacementDetailIds.add(detail.getId());
                    refundAmount = refundAmount.add(detail.getLineSubtotal());
                }

                if (noReplacementDetailIds.isEmpty()) {
                    throw new DomainException(
                            ErrorCode.INVALID_INPUT,
                            "Không có vé sự cố nào cần hoàn tiền từng phần.");
                }

                RefundRequestModel refundRequest = RefundRequestModel.builder()
                        .requestedBy(order.getUserId())
                        .orderId(order.getId())
                        .refundType(RefundType.ORDER_DETAIL)
                        .refundReason("Hoàn tiền từng phần cho các vé không thể đổi")
                        .operatorNote(request.refundNote())
                        .createdBy(staffId.toString())
                        .refundAmount(refundAmount)
                        .build();
                refundRequest.initializeForStaffIncidentCancel();
                refundRequest = refundRequestRepositoryPort.save(refundRequest);

                // order_id is not persisted on refund_requests — link OrderDetails so order can be resolved later
                // (markTransferred / getByIdForStaff rely on order_details.refund_request_id).
                int linked = refundRequestRepositoryPort.linkOrderDetailsByIds(
                        noReplacementDetailIds, refundRequest.getId());
                if (linked <= 0) {
                    throw new DomainException(
                            ErrorCode.REFUND_ORDER_ALREADY_REQUESTED,
                            "Không gắn được vé sự cố vào yêu cầu hoàn tiền (có thể đã được hoàn trước đó).");
                }

                // Keep in-memory order details consistent for subsequent save/status transition.
                for (OrderDetailModel detail : order.getOrderDetails()) {
                    if (noReplacementDetailIds.contains(detail.getId())) {
                        detail.setRefundRequestId(refundRequest.getId());
                        if (detail.getStatus() == OrderDetailStatus.ACTIVE) {
                            detail.markRefundPending();
                        }
                    }
                }

                refundRequest.setOrderId(order.getId());
                refundRequest.setOrderDetailIds(noReplacementDetailIds);
                createdRefund = refundRequestRepositoryPort.save(refundRequest);
            } else {
                createdRefund = existingRefunds.getFirst();
                createdRefund.setOrderId(order.getId());
            }
        }

        // Change order status to PENDING_PICKUP
        order.markPendingPickup();
        orderRepositoryPort.save(order);

        if (createdRefund != null) {
            // Partial refund during inspection: notify refund flow (bank info), not normal pickup message.
            publishRefundStatusChanged(createdRefund);
        } else {
            eventPublisher.publishEvent(new OrderStatusChangedEvent(
                    order.getId(), order.getUserId(), order.getOrderCode(), OrderStatus.PENDING_PICKUP));
        }

        // Only return a refund when this flow actually needed one (unreplaced tickets).
        // All-replaced inspections must not create or return a Refund Request.
        if (createdRefund != null) {
            return toEnrichedResponse(createdRefund, loadBankAccount(createdRefund.getBankAccountId()), order.getOrderCode());
        }
        
        return null;
    }
}
