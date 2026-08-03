package com.daiphat.coreapi.infrastructure.adapter.out.payout.persistence;

import com.daiphat.coreapi.application.port.out.payout.PrizePayoutRequestRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutRequestStatus;
import com.daiphat.coreapi.domain.model.payout.PrizePayoutRequestModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.payout.PrizePayoutRequestPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.payout.PrizePayoutRequestRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.PrizePayoutRequestSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PrizePayoutRequestRepositoryAdapter implements PrizePayoutRequestRepositoryPort {

    private final PrizePayoutRequestRepository prizePayoutRequestRepository;
    private final PrizePayoutRequestPersistenceMapper prizePayoutRequestPersistenceMapper;

    @Override
    public Optional<PrizePayoutRequestModel> findById(Long id) {
        return prizePayoutRequestRepository.findById(id)
                .map(prizePayoutRequestPersistenceMapper::toDomain);
    }

    @Override
    public PrizePayoutRequestModel save(PrizePayoutRequestModel model) {
        var entity = prizePayoutRequestPersistenceMapper.toEntity(model);
        return prizePayoutRequestPersistenceMapper.toDomain(prizePayoutRequestRepository.save(entity));
    }

    @Override
    public boolean existsByRequestCode(String requestCode) {
        return prizePayoutRequestRepository.existsByRequestCode(requestCode);
    }

    @Override
    public boolean existsBySerialIdAndStatuses(Long serialId, Collection<PrizePayoutRequestStatus> statuses) {
        return prizePayoutRequestRepository.existsBySerial_IdAndStatusIn(serialId, statuses);
    }

    @Override
    public long countBySerialIdAndChannelAndStatuses(
            Long serialId,
            com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel channel,
            Collection<PrizePayoutRequestStatus> statuses) {
        return prizePayoutRequestRepository.countBySerial_IdAndChannelAndStatusIn(serialId, channel, statuses);
    }

    @Override
    public boolean existsBySerialIdAndChannelAndStatus(
            Long serialId,
            com.daiphat.coreapi.domain.model.enums.payout.PrizePayoutChannel channel,
            PrizePayoutRequestStatus status) {
        return prizePayoutRequestRepository.existsBySerial_IdAndChannelAndStatus(serialId, channel, status);
    }

    @Override
    public Optional<PrizePayoutRequestModel> findPendingBySerialId(Long serialId) {
        return prizePayoutRequestRepository.findBySerial_IdAndStatus(serialId, PrizePayoutRequestStatus.PENDING)
                .map(prizePayoutRequestPersistenceMapper::toDomain);
    }

    @Override
    public Map<Long, PrizePayoutRequestModel> findPendingBySerialIds(Collection<Long> serialIds) {
        if (serialIds == null || serialIds.isEmpty()) {
            return Map.of();
        }
        List<PrizePayoutRequestModel> pending = prizePayoutRequestRepository
                .findBySerial_IdInAndStatus(serialIds, PrizePayoutRequestStatus.PENDING)
                .stream()
                .map(prizePayoutRequestPersistenceMapper::toDomain)
                .toList();
        Map<Long, PrizePayoutRequestModel> result = new HashMap<>();
        for (PrizePayoutRequestModel model : pending) {
            if (model.getSerialId() != null) {
                result.put(model.getSerialId(), model);
            }
        }
        return result;
    }

    @Override
    public Map<Long, PrizePayoutRequestModel> findLatestBySerialIds(Collection<Long> serialIds) {
        if (serialIds == null || serialIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, PrizePayoutRequestModel> result = new HashMap<>();
        prizePayoutRequestRepository.findBySerial_IdInOrderByCreatedAtDesc(serialIds).stream()
                .map(prizePayoutRequestPersistenceMapper::toDomain)
                .forEach(model -> {
                    if (model.getSerialId() != null) {
                        result.putIfAbsent(model.getSerialId(), model);
                    }
                });
        return result;
    }

    @Override
    public Page<PrizePayoutRequestModel> findAll(
            Pageable pageable,
            UUID customerId,
            PrizePayoutRequestStatus status,
            Collection<PrizePayoutRequestStatus> statuses,
            String search) {
        return prizePayoutRequestRepository.findAll(
                PrizePayoutRequestSpecification.filter(customerId, status, statuses, normalizeSearch(search)),
                pageable)
                .map(prizePayoutRequestPersistenceMapper::toDomain);
    }

    @Override
    public long countByStatus(PrizePayoutRequestStatus status, UUID customerId, String search) {
        return prizePayoutRequestRepository.count(
                PrizePayoutRequestSpecification.filter(customerId, status, null, normalizeSearch(search)));
    }

    @Override
    public long countPendingByCustomerId(UUID customerId) {
        return prizePayoutRequestRepository.countByCustomer_IdAndStatus(customerId, PrizePayoutRequestStatus.PENDING);
    }

    @Override
    public BigDecimal sumGrossAmountByStatus(PrizePayoutRequestStatus status) {
        return prizePayoutRequestRepository.sumGrossAmountByStatus(status);
    }

    private String normalizeSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return search.trim();
    }
}
