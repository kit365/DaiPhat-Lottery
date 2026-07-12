package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.refund.RefundRequestRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.order.refund.RefundRequestStatus;
import com.daiphat.coreapi.domain.model.refund.RefundRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.refund.RefundRequestPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.order.OrderDetailRepository;
import com.daiphat.coreapi.infrastructure.persistence.repository.refund.RefundRequestRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.RefundRequestSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RefundRequestRepositoryAdapter implements RefundRequestRepositoryPort {

    private final RefundRequestRepository refundRequestRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final RefundRequestPersistenceMapper refundRequestPersistenceMapper;

    @Override
    public Optional<RefundRequestModel> findById(Long id) {
        return refundRequestRepository.findById(id).map(this::toDomainWithDetails);
    }

    @Override
    public RefundRequestModel save(RefundRequestModel request) {
        var entity = refundRequestPersistenceMapper.toEntity(request);
        return toDomainWithDetails(refundRequestRepository.save(entity));
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
                .map(this::toDomainWithDetails);
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
                bankAccountId, RefundRequestStatus.READY_TO_PAY)
                || refundRequestRepository.existsByBankAccount_IdAndStatus(
                bankAccountId, RefundRequestStatus.WAITING_FOR_INFO)
                || refundRequestRepository.existsByBankAccount_IdAndStatus(
                bankAccountId, RefundRequestStatus.APPROVED);
    }

    @Override
    public boolean existsLinkedOrderDetailByOrderId(UUID orderId) {
        return orderDetailRepository.existsByOrder_IdAndRefundRequestIsNotNull(orderId);
    }

    @Override
    @Transactional
    public int linkOrderDetailsByOrderId(UUID orderId, Long refundRequestId) {
        return orderDetailRepository.linkUnlinkedDetailsByOrderId(orderId, refundRequestId);
    }

    @Override
    public List<Long> findOrderDetailIdsByRefundRequestId(Long refundRequestId) {
        return orderDetailRepository.findIdsByRefundRequestId(refundRequestId);
    }

    @Override
    public Optional<UUID> findOrderIdByRefundRequestId(Long refundRequestId) {
        return orderDetailRepository.findOrderIdsByRefundRequestId(refundRequestId).stream().findFirst();
    }

    @Override
    public long countByRequestedByAndCreatedAtFrom(UUID requestedBy, java.time.LocalDateTime createdFrom) {
        return refundRequestRepository.countByRequestedBy_IdAndCreatedAtGreaterThanEqual(requestedBy, createdFrom);
    }

    @Override
    public List<RefundRequestModel> findExpirableByStatusesAndCreatedBefore(
            Collection<RefundRequestStatus> statuses,
            java.time.LocalDateTime createdBefore) {
        return refundRequestRepository.findByStatusInAndCreatedAtBefore(statuses, createdBefore).stream()
                .map(this::toDomainWithDetails)
                .toList();
    }

    private RefundRequestModel toDomainWithDetails(
            com.daiphat.coreapi.infrastructure.persistence.entity.refund.RefundRequestEntity entity) {
        RefundRequestModel model = refundRequestPersistenceMapper.toDomain(entity);
        if (entity.getId() != null) {
            model.setOrderDetailIds(orderDetailRepository.findIdsByRefundRequestId(entity.getId()));
            orderDetailRepository.findOrderIdsByRefundRequestId(entity.getId()).stream()
                    .findFirst()
                    .ifPresent(model::setOrderId);
        }
        return model;
    }

    private static String normalizeSearch(String search) {
        return (search == null || search.isBlank()) ? null : search.trim();
    }
}
