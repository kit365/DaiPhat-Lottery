package com.daiphat.coreapi.application.service.refund;

import com.daiphat.coreapi.application.dto.request.refund.RejectRefundRequestRequest;
import com.daiphat.coreapi.application.dto.request.refund.TransferRefundRequestRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundProcessingHistoryItem;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestAdminDetailResponse;
import com.daiphat.coreapi.application.dto.response.refund.RefundRequestResponse;
import com.daiphat.coreapi.application.event.OrderStatusChangedEvent;
import com.daiphat.coreapi.application.event.RefundRequestStatusChangedEvent;
import com.daiphat.coreapi.application.mapper.refund.RefundApplicationMapper;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.application.port.in.refund.RefundRequestStaffServicePort;
import com.daiphat.coreapi.application.port.out.order.OrderRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.application.port.out.refund.UserBankAccountRepositoryPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.order.OrderStatus;
import com.daiphat.coreapi.domain.model.enums.order.OrderType;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.orders.OrderDetailModel;
import com.daiphat.coreapi.domain.model.orders.OrderModel;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.domain.model.refund.UserBankAccountModel;
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

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefundRequestStaffService implements RefundRequestStaffServicePort {

    private final RefundRequestRepositoryPort refundRequestRepositoryPort;
    private final UserBankAccountRepositoryPort userBankAccountRepositoryPort;
    private final OrderRepositoryPort orderRepositoryPort;
    private final UserRepositoryPort userRepositoryPort;
    private final LotteryTicketServicePort lotteryTicketServicePort;
    private final RefundApplicationMapper refundApplicationMapper;
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

        Page<RefundRequestResponse> mapped = resultPage.map(model -> toResponse(
                model, loadBankAccount(model.getBankAccountId())));

        return PageResponse.from(mapped, page, limit, buildStatusCounts(orderId, search));
    }

    @Override
    @Transactional(readOnly = true)
    public RefundRequestAdminDetailResponse getByIdForStaff(Long id) {
        RefundRequestModel request = getRequestOrThrow(id);
        UserBankAccountModel bankAccount = loadBankAccount(request.getBankAccountId());
        RefundRequestResponse refund = toResponse(request, bankAccount);

        OrderModel order = orderRepositoryPort.findById(request.getOrderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        UserModel customer = userRepositoryPort.findById(request.getRequestedBy())
                .orElse(null);

        String reviewerName = resolveUserName(request.getReviewedBy());
        String transferrerName = resolveUserName(request.getTransferredBy());

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
                buildProcessingHistory(request));
    }

    @Override
    @Transactional
    public RefundRequestResponse approve(Long id, UUID staffId) {
        log.info("Staff {} approving refund request {}", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        if (refund.getStatus() != RefundRequestStatus.PENDING) {
            throw new DomainException(ErrorCode.REFUND_REQUEST_INVALID_STATUS);
        }

        OrderModel order = orderRepositoryPort.findByIdWithLock(refund.getOrderId())
                .orElseThrow(() -> new DomainException(ErrorCode.ORDER_NOT_FOUND));

        if (order.getStatus() != OrderStatus.PREPARING) {
            throw new DomainException(ErrorCode.ORDER_INVALID_STATUS);
        }

        String cancelReason = refund.getRefundReason();
        refund.approve(staffId);
        cancelOrderForStaffApproval(order, cancelReason);
        releaseSoldTickets(order);

        orderRepositoryPort.save(order);
        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);

        publishRefundStatusChanged(saved);
        publishOrderCancelled(order);

        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
    }

    @Override
    @Transactional
    public RefundRequestResponse reject(Long id, UUID staffId, RejectRefundRequestRequest request) {
        log.info("Staff {} rejecting refund request {}", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        refund.reject(staffId, request.rejectReason());

        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
        publishRefundStatusChanged(saved);

        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
    }

    @Override
    @Transactional
    public RefundRequestResponse markTransferred(Long id, UUID staffId, TransferRefundRequestRequest request) {
        log.info("Staff {} marking refund request {} as transferred", staffId, id);

        RefundRequestModel refund = getRequestOrThrow(id);
        refund.markPaid(staffId, request.transferEvidenceUrl(), request.transferNote());

        RefundRequestModel saved = refundRequestRepositoryPort.save(refund);
        publishRefundStatusChanged(saved);

        return toResponse(saved, loadBankAccount(saved.getBankAccountId()));
    }

    private RefundRequestModel getRequestOrThrow(Long id) {
        return refundRequestRepositoryPort.findById(id)
                .orElseThrow(() -> new DomainException(ErrorCode.REFUND_REQUEST_NOT_FOUND));
    }

    private void cancelOrderForStaffApproval(OrderModel order, String cancelReason) {
        if (order.getOrderType() == OrderType.DIRECT) {
            order.cancelDirectOrder(cancelReason);
        } else {
            order.cancelAfterPayment(cancelReason);
        }
    }

    private void releaseSoldTickets(OrderModel order) {
        if (order.getOrderDetails() == null) {
            return;
        }
        for (OrderDetailModel detail : order.getOrderDetails()) {
            if (detail.getLotteryTicketSerialId() != null) {
                lotteryTicketServicePort.returnSoldTicketForOrder(detail.getLotteryTicketSerialId());
            }
        }
    }

    private void publishRefundStatusChanged(RefundRequestModel refund) {
        eventPublisher.publishEvent(RefundRequestStatusChangedEvent.builder()
                .refundRequestId(refund.getId())
                .customerId(refund.getRequestedBy())
                .orderId(refund.getOrderId())
                .status(refund.getStatus())
                .rejectReason(refund.getRejectReason())
                .transferNote(refund.getTransferNote())
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

    private List<RefundProcessingHistoryItem> buildProcessingHistory(RefundRequestModel request) {
        List<RefundProcessingHistoryItem> history = new ArrayList<>();

        if (request.getCreatedAt() != null) {
            history.add(new RefundProcessingHistoryItem(
                    "Khách hàng tạo yêu cầu",
                    request.getRefundReason(),
                    request.getCreatedAt()));
        }

        if (request.getReviewedAt() != null) {
            if (request.getStatus() == RefundRequestStatus.REJECTED) {
                history.add(new RefundProcessingHistoryItem(
                        "Từ chối yêu cầu",
                        request.getRejectReason(),
                        request.getReviewedAt()));
            } else if (request.getStatus() == RefundRequestStatus.APPROVED
                    || request.getStatus() == RefundRequestStatus.PAID
                    || request.getStatus() == RefundRequestStatus.READY_TO_PAY) {
                history.add(new RefundProcessingHistoryItem(
                        "Duyệt yêu cầu",
                        null,
                        request.getReviewedAt()));
            }
        }

        if (request.getTransferredAt() != null) {
            history.add(new RefundProcessingHistoryItem(
                    "Đã chuyển khoản",
                    request.getTransferNote(),
                    request.getTransferredAt()));
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

    private RefundRequestResponse toResponse(RefundRequestModel model, UserBankAccountModel bankAccount) {
        return refundApplicationMapper.toRefundResponse(model, bankAccount);
    }

    private UserBankAccountModel loadBankAccount(Long bankAccountId) {
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
}
