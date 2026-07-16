package com.daiphat.coreapi.application.port.out.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefundRequestRepositoryPort {

    Optional<RefundRequestModel> findById(Long id);

    RefundRequestModel save(RefundRequestModel request);

    Page<RefundRequestModel> findAll(
            Pageable pageable,
            UUID requestedBy,
            RefundRequestStatus status,
            Collection<RefundRequestStatus> statuses,
            UUID orderId,
            String search
    );

    long countAll(
            UUID requestedBy,
            RefundRequestStatus status,
            Collection<RefundRequestStatus> statuses,
            UUID orderId,
            String search
    );

    long countByStatus(
            RefundRequestStatus status,
            UUID requestedBy,
            UUID orderId,
            String search
    );

    boolean existsPendingByBankAccountId(Long bankAccountId);

    /** True if any order detail of the order is already linked to a refund request. */
    boolean existsLinkedOrderDetailByOrderId(UUID orderId);

    /** Links all unlinked order details of the order to the refund request. Returns linked count. */
    int linkOrderDetailsByOrderId(UUID orderId, Long refundRequestId);

    /**
     * Links specific unlinked order details to the refund request and marks them REFUND_PENDING.
     * Used for partial (ORDER_DETAIL) refunds during order inspection.
     */
    int linkOrderDetailsByIds(List<Long> orderDetailIds, Long refundRequestId);

    List<Long> findOrderDetailIdsByRefundRequestId(Long refundRequestId);

    Optional<UUID> findOrderIdByRefundRequestId(Long refundRequestId);

    long countByRequestedByAndCreatedAtFrom(UUID requestedBy, java.time.LocalDateTime createdFrom);
}
