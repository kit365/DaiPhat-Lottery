package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryTicketPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lottery.LotteryTicketRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LotteryTicketRepositoryAdapter implements LotteryTicketRepositoryPort {

    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketPersistenceMapper lotteryTicketPersistenceMapper;

    @Override
    public LotteryTicketModel save(LotteryTicketModel model) {
        LotteryTicketEntity entity = lotteryTicketPersistenceMapper.toEntity(model);
        LotteryTicketEntity saved = lotteryTicketRepository.save(entity);
        return lotteryTicketPersistenceMapper.toDomain(saved);
    }

    @Override
    public Optional<LotteryTicketModel> findById(UUID id) {
        return lotteryTicketRepository.findById(id)
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryTicketModel> findAll(
            Pageable pageable, UUID productId, LotteryTicketStatus status,
            LocalDate drawDate, String search) {

        Specification<LotteryTicketEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (productId != null) {
                predicates.add(cb.equal(root.get("product").get("id"), productId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (drawDate != null) {
                predicates.add(cb.equal(root.get("drawDate"), drawDate));
            }
            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("serialNumber")), searchPattern),
                        cb.like(cb.lower(root.get("numbers")), searchPattern),
                        cb.like(cb.lower(root.get("batchCode")), searchPattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return lotteryTicketRepository.findAll(spec, pageable)
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public void deleteById(UUID id) {
        lotteryTicketRepository.deleteById(id);
    }

    @Override
    public boolean existsByUniqueFields(UUID productId, String serialNumber, String numbers, LocalDate drawDate) {
        return lotteryTicketRepository.existsByProduct_IdAndSerialNumberAndNumbersAndDrawDate(
                productId, serialNumber, numbers, drawDate);
    }

    @Override
    public boolean existsByUniqueFieldsAndIdNot(UUID productId, String serialNumber, String numbers, LocalDate drawDate, UUID id) {
        return lotteryTicketRepository.existsByProduct_IdAndSerialNumberAndNumbersAndDrawDateAndIdNot(
                productId, serialNumber, numbers, drawDate, id);
    }

    @Override
    public long countByProductIdAndStatuses(UUID productId, Collection<LotteryTicketStatus> statuses) {
        return lotteryTicketRepository.countByProduct_IdAndStatusIn(productId, statuses);
    }
}
