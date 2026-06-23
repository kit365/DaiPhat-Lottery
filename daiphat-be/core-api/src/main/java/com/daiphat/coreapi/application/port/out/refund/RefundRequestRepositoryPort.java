package com.daiphat.coreapi.application.port.out.refund;

import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface RefundRequestRepositoryPort {

    Optional<RefundRequestModel> findById(Long id);

    RefundRequestModel save(RefundRequestModel request);

    Page<RefundRequestModel> findAll(
            Pageable pageable,
            UUID requestedBy,
            RefundRequestStatus status,
            UUID orderId,
            String search
    );

    long countAll(UUID requestedBy, RefundRequestStatus status, UUID orderId, String search);

    long countByStatus(
            RefundRequestStatus status,
            UUID requestedBy,
            UUID orderId,
            String search
    );

    boolean existsPendingByBankAccountId(Long bankAccountId);

    boolean existsActiveByOrderId(UUID orderId);
}
