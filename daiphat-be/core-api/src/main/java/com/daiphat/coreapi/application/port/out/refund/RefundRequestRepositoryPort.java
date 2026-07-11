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

    boolean existsActiveByOrderId(UUID orderId);

    /** True if any refund request row exists for the order (denormalized order_id). */
    boolean existsByOrderId(UUID orderId);

    /** True if any order detail of the order is already linked to a refund request. */
    boolean existsLinkedOrderDetailByOrderId(UUID orderId);

    /** Links all unlinked order details of the order to the refund request. Returns linked count. */
    int linkOrderDetailsByOrderId(UUID orderId, Long refundRequestId);

    List<Long> findOrderDetailIdsByRefundRequestId(Long refundRequestId);

    long countByRequestedByAndCreatedAtFrom(UUID requestedBy, java.time.LocalDateTime createdFrom);

    List<RefundRequestModel> findExpirableByStatusesAndCreatedBefore(
            Collection<RefundRequestStatus> statuses,
            java.time.LocalDateTime createdBefore
    );
}
