package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.refund.RefundRequestPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.RefundRequestRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.RefundRequestSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RefundRequestRepositoryAdapter implements RefundRequestRepositoryPort {

    private final RefundRequestRepository refundRequestRepository;
    private final RefundRequestPersistenceMapper refundRequestPersistenceMapper;

    @Override
    public Optional<RefundRequestModel> findById(Long id) {
        return refundRequestRepository.findById(id)
                .map(refundRequestPersistenceMapper::toDomain);
    }

    @Override
    public RefundRequestModel save(RefundRequestModel request) {
        var entity = refundRequestPersistenceMapper.toEntity(request);
        return refundRequestPersistenceMapper.toDomain(refundRequestRepository.save(entity));
    }

    @Override
    public Page<RefundRequestModel> findAll(
            Pageable pageable,
            UUID requestedBy,
            RefundRequestStatus status,
            Collection<RefundRequestStatus> statuses,
            UUID orderId,
            String search) {
        String normalizedSearch = normalizeSearch(search);
        return refundRequestRepository.findAll(
                        RefundRequestSpecification.filter(
                                requestedBy, status, statuses, orderId, normalizedSearch),
                        pageable)
                .map(refundRequestPersistenceMapper::toDomain);
    }

    @Override
    public long countAll(
            UUID requestedBy,
            RefundRequestStatus status,
            Collection<RefundRequestStatus> statuses,
            UUID orderId,
            String search) {
        return refundRequestRepository.count(
                RefundRequestSpecification.filter(
                        requestedBy, status, statuses, orderId, normalizeSearch(search)));
    }

    @Override
    public long countByStatus(
            RefundRequestStatus status,
            UUID requestedBy,
            UUID orderId,
            String search) {
        return refundRequestRepository.count(
                RefundRequestSpecification.filter(requestedBy, status, orderId, normalizeSearch(search)));
    }

    @Override
    public boolean existsPendingByBankAccountId(Long bankAccountId) {
        return refundRequestRepository.existsByBankAccount_IdAndStatus(
                bankAccountId, RefundRequestStatus.PENDING);
    }

    @Override
    public boolean existsActiveByOrderId(UUID orderId) {
        return refundRequestRepository.existsByOrder_IdAndStatusIn(
                orderId,
                List.of(
                        RefundRequestStatus.PENDING,
                        RefundRequestStatus.APPROVED,
                        RefundRequestStatus.READY_TO_PAY));
    }

    @Override
    public boolean existsByOrderId(UUID orderId) {
        return refundRequestRepository.existsByOrder_Id(orderId);
    }

    @Override
    public List<RefundRequestModel> findExpirableByStatusesAndCreatedBefore(
            Collection<RefundRequestStatus> statuses,
            java.time.LocalDateTime createdBefore) {
        return refundRequestRepository.findByStatusInAndCreatedAtBefore(statuses, createdBefore).stream()
                .map(refundRequestPersistenceMapper::toDomain)
                .toList();
    }

    private static String normalizeSearch(String search) {
        return (search == null || search.isBlank()) ? null : search.trim();
    }
}
