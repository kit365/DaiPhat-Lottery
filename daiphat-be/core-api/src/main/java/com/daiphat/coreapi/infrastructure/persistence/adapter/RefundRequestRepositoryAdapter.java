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
            UUID orderId,
            String search) {
        String normalizedSearch = normalizeSearch(search);
        return refundRequestRepository.findAll(
                        RefundRequestSpecification.filter(requestedBy, status, orderId, normalizedSearch),
                        pageable)
                .map(refundRequestPersistenceMapper::toDomain);
    }

    @Override
    public long countAll(UUID requestedBy, RefundRequestStatus status, UUID orderId, String search) {
        return refundRequestRepository.count(
                RefundRequestSpecification.filter(requestedBy, status, orderId, normalizeSearch(search)));
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

    private static String normalizeSearch(String search) {
        return (search == null || search.isBlank()) ? null : search.trim();
    }
}
