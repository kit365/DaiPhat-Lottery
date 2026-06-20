package com.daiphat.coreapi.infrastructure.persistence.adapter.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryTicketPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketRepository;
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
    public List<LotteryTicketModel> findAllByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return lotteryTicketRepository.findAllByIdInAndDeletedAtIsNull(ids).stream()
                .map(lotteryTicketPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<LotteryTicketModel> findByUniqueFields(Long stationId, String numbers, LocalDate drawDate) {
        return lotteryTicketRepository.findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(stationId, numbers, drawDate)
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryTicketModel> findAll(
            Pageable pageable, Long stationId, Collection<Long> stationIds, LotteryTicketStatus status,
            LocalDate drawDate, String search) {
        return lotteryTicketRepository.findAll(
                        LotteryTicketSpecification.filter(
                                stationId,
                                stationIds != null ? List.copyOf(stationIds) : List.of(),
                                status,
                                drawDate,
                                search
                        ),
                        pageable
                )
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryTicketModel> findAllPublic(
            Pageable pageable, Long stationId, Collection<Long> stationIds, LocalDate drawDate, String search) {
        return lotteryTicketRepository.findAll(
                        LotteryTicketSpecification.filterPublic(
                                stationId,
                                stationIds != null ? List.copyOf(stationIds) : List.of(),
                                drawDate,
                                search
                        ),
                        pageable
                )
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public List<LotteryTicketModel> findExpirableTickets(LocalDate beforeDate, Collection<LotteryTicketStatus> statuses) {
        return lotteryTicketRepository.findAllByDrawDateLessThanEqualAndStatusInAndDeletedAtIsNull(beforeDate, statuses).stream()
                .map(lotteryTicketPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<LotteryTicketModel> findAllByStationIdAndDrawDateAndStatuses(Long stationId, LocalDate drawDate, Collection<LotteryTicketStatus> statuses) {
        return lotteryTicketRepository.findAllByStation_IdAndDrawDateAndStatusInAndDeletedAtIsNull(stationId, drawDate, statuses).stream()
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
    public boolean existsByUniqueFields(Long stationId, String numbers, LocalDate drawDate) {
        return lotteryTicketRepository.existsByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
                stationId, numbers, drawDate);
    }

    @Override
    public boolean existsByUniqueFieldsAndIdNot(Long stationId, String numbers, LocalDate drawDate, Long id) {
        return lotteryTicketRepository.existsByStation_IdAndNumbersAndDrawDateAndIdNotAndDeletedAtIsNull(
                stationId, numbers, drawDate, id);
    }

    @Override
    public long sumQuantityByProductIdAndStatuses(Long stationId, Collection<LotteryTicketStatus> statuses) {
        return lotteryTicketRepository.sumQuantityByStationIdAndStatusInAndDeletedAtIsNull(stationId, statuses);
    }
}
