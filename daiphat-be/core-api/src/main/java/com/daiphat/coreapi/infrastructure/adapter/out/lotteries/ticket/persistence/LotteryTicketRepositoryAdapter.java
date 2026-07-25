package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.ticket.persistence;

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
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LotteryTicketRepositoryAdapter implements LotteryTicketRepositoryPort {

    private final LotteryTicketRepository lotteryTicketRepository;
    private final LotteryTicketPersistenceMapper lotteryTicketPersistenceMapper;

    @Override
    public LotteryTicketModel save(LotteryTicketModel model) {
        LotteryTicketEntity entity;
        if (model.getId() != null) {
            // Load managed entity and patch it so persistence-only fields (e.g. batchCode)
            // are not wiped when mapping from domain (domain has no batchCode).
            entity = lotteryTicketRepository.findById(model.getId())
                    .orElseGet(() -> lotteryTicketPersistenceMapper.toEntity(model));
            if (entity.getId() != null) {
                lotteryTicketPersistenceMapper.updateEntityFromModel(model, entity);
            }
        } else {
            entity = lotteryTicketPersistenceMapper.toEntity(model);
        }
        if (entity.getBatchCode() == null || entity.getBatchCode().isBlank()) {
            entity.setBatchCode("LEGACY-" + (entity.getId() != null ? entity.getId() : UUID.randomUUID()));
        }
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
            Collection<LocalDate> drawDates, LocalDate drawDateFrom, LocalDate drawDateTo, Long importBatchLineId, String search) {
        return lotteryTicketRepository.findAll(
                        LotteryTicketSpecification.filter(
                                stationId,
                                stationIds != null ? List.copyOf(stationIds) : List.of(),
                                status,
                                drawDates != null ? List.copyOf(drawDates) : List.of(),
                                drawDateFrom,
                                drawDateTo,
                                importBatchLineId,
                                search
                        ),
                        pageable
                )
                .map(lotteryTicketPersistenceMapper::toDomain);
    }

    @Override
    public Page<LotteryTicketModel> findAllPublic(
            Pageable pageable, Long stationId, Collection<Long> stationIds, Collection<LocalDate> drawDates, String search) {
        return findAllPublic(pageable, stationId, stationIds, drawDates, search, null, null, null, null);
    }

    @Override
    public Page<LotteryTicketModel> findAllPublic(
            Pageable pageable,
            Long stationId,
            Collection<Long> stationIds,
            Collection<LocalDate> drawDates,
            String search,
            com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode searchMode) {
        return findAllPublic(pageable, stationId, stationIds, drawDates, search, searchMode, null, null, null);
    }

    @Override
    public Page<LotteryTicketModel> findAllPublic(
            Pageable pageable,
            Long stationId,
            Collection<Long> stationIds,
            Collection<LocalDate> drawDates,
            String search,
            com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode searchMode,
            List<String> searches,
            List<String> tailRanges,
            List<String> numberTypes) {
        return lotteryTicketRepository.findAll(
                        LotteryTicketSpecification.filterPublic(
                                stationId,
                                stationIds != null ? List.copyOf(stationIds) : List.of(),
                                drawDates != null ? List.copyOf(drawDates) : List.of(),
                                search,
                                searchMode,
                                searches,
                                tailRanges,
                                numberTypes
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
        if (statuses == null || statuses.isEmpty()) {
            return 0L;
        }
        return lotteryTicketRepository.sumQuantityByStationIdAndStatusInAndDeletedAtIsNull(stationId, statuses);
    }

    @Override
    public java.util.List<com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey> findAvailableReplacementsInBulk(
            Collection<Long> stationIds, Collection<LocalDate> drawDates, Collection<String> numbers) {
        if (stationIds == null || stationIds.isEmpty() || drawDates == null || drawDates.isEmpty() || numbers == null || numbers.isEmpty()) {
            return java.util.List.of();
        }
        return lotteryTicketRepository.findAvailableReplacementsInBulk(stationIds, drawDates, numbers);
    }

    @Override
    public java.util.List<LotteryTicketModel> findAllReplacementCandidates(
            Long stationId, String numbers, LocalDate drawDate, LotteryTicketStatus status) {
        return lotteryTicketRepository.findAllByStation_IdAndNumbersAndDrawDateAndStatusAndDeletedAtIsNull(
                stationId, numbers, drawDate, status).stream()
                .map(lotteryTicketPersistenceMapper::toDomain)
                .toList();
    }
}
