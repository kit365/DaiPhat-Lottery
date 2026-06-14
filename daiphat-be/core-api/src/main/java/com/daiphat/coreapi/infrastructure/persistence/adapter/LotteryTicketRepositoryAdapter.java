package com.daiphat.coreapi.infrastructure.persistence.adapter;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryTicketPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lottery.LotteryTicketRepository;
import com.daiphat.coreapi.infrastructure.persistence.specification.LotteryTicketSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
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
    public Optional<LotteryTicketModel> findById(Long id) {
        return lotteryTicketRepository.findOne(LotteryTicketSpecification.byId(id))
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Optional<LotteryTicketModel> findByIdIncludingDeleted(Long id) {
        return lotteryTicketRepository.findById(id)
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryTicketModel> findAll(
            Pageable pageable, Long productId, LotteryTicketStatus status,
            LocalDate drawDate, String search) {
        return lotteryTicketRepository.findAll(
                        LotteryTicketSpecification.filter(productId, status, drawDate, search),
                        pageable
                )
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryTicketModel> findAllDeleted(Pageable pageable) {
        return lotteryTicketRepository.findAll(LotteryTicketSpecification.deleted(), pageable)
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public List<LotteryTicketModel> findExpirableTickets(LocalDate beforeDate, Collection<LotteryTicketStatus> statuses) {
        return lotteryTicketRepository.findAllByDrawDateBeforeAndStatusInAndDeletedAtIsNull(beforeDate, statuses).stream()
                .map(lotteryTicketPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public void deleteById(Long id) {
        lotteryTicketRepository.findById(id).ifPresent(entity -> {
            entity.setDeletedAt(LocalDateTime.now());
            lotteryTicketRepository.save(entity);
        });
    }

    @Override
    public boolean existsByUniqueFields(Long productId, String serialNumber, String numbers, LocalDate drawDate) {
        return lotteryTicketRepository.existsByStation_IdAndSerialNumberAndNumbersAndDrawDateAndDeletedAtIsNull(
                productId, serialNumber, numbers, drawDate);
    }

    @Override
    public boolean existsByUniqueFieldsAndIdNot(Long productId, String serialNumber, String numbers, LocalDate drawDate, Long id) {
        return lotteryTicketRepository.existsByStation_IdAndSerialNumberAndNumbersAndDrawDateAndIdNotAndDeletedAtIsNull(
                productId, serialNumber, numbers, drawDate, id);
    }

    @Override
    public long countByProductIdAndStatuses(Long productId, Collection<LotteryTicketStatus> statuses) {
        return lotteryTicketRepository.countByStation_IdAndStatusInAndDeletedAtIsNull(productId, statuses);
    }
}
