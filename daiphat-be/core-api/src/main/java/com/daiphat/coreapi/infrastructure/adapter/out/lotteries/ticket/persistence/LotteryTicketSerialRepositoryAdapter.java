package com.daiphat.coreapi.infrastructure.adapter.out.lotteries;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryTicketSerialPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class LotteryTicketSerialRepositoryAdapter implements LotteryTicketSerialRepositoryPort {

    private final LotteryTicketSerialRepository lotteryTicketSerialRepository;
    private final LotteryTicketSerialPersistenceMapper lotteryTicketSerialPersistenceMapper;

    @Override
    public LotteryTicketSerialModel save(LotteryTicketSerialModel model) {
        return lotteryTicketSerialPersistenceMapper.toDomain(
                lotteryTicketSerialRepository.save(
                        lotteryTicketSerialPersistenceMapper.toEntity(model)
                )
        );
    }

    @Override
    public Optional<LotteryTicketSerialModel> findById(Long id) {
        return lotteryTicketSerialRepository.findById(id)
                .filter(entity -> entity.getDeletedAt() == null)
                .map(lotteryTicketSerialPersistenceMapper::toDomain);
    }

    @Override
    public Optional<LotteryTicketSerialModel> findFirstByTicketIdOrderByIdAsc(Long ticketId) {
        return lotteryTicketSerialRepository.findFirstByTicket_IdAndDeletedAtIsNullOrderByIdAsc(ticketId)
                .map(lotteryTicketSerialPersistenceMapper::toDomain);
    }

    @Override
    public Map<Long, LotteryTicketSerialModel> findRepresentativeSerialsByTicketIds(List<Long> ticketIds) {
        Map<Long, LotteryTicketSerialModel> serialsByTicketId = new LinkedHashMap<>();
        if (ticketIds == null || ticketIds.isEmpty()) {
            return serialsByTicketId;
        }

        lotteryTicketSerialRepository.findByTicket_IdInAndDeletedAtIsNullOrderByTicket_IdAscIdAsc(ticketIds)
                .forEach(entity -> serialsByTicketId.putIfAbsent(
                        entity.getTicket().getId(),
                        lotteryTicketSerialPersistenceMapper.toDomain(entity)
                ));

        return serialsByTicketId;
    }

    @Override
    public Optional<LotteryTicketSerialModel> findFirstByTicketIdAndStatusOrderByIdAsc(Long ticketId, LotteryTicketSerialStatus status) {
        return lotteryTicketSerialRepository.findFirstByTicket_IdAndStatusAndDeletedAtIsNullOrderByIdAsc(ticketId, status)
                .map(lotteryTicketSerialPersistenceMapper::toDomain);
    }

    @Override
    public boolean existsByTicketIdAndSerialNumber(Long ticketId, String serialNumber) {
        return lotteryTicketSerialRepository.existsByTicket_IdAndSerialNumberAndDeletedAtIsNull(ticketId, serialNumber);
    }

    @Override
    public long countByTicketIdAndStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses) {
        return lotteryTicketSerialRepository.countByTicket_IdAndStatusInAndDeletedAtIsNull(ticketId, statuses);
    }

    @Override
    public List<LotteryTicketSerialModel> findByTicketIdAndStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses) {
        return lotteryTicketSerialRepository.findByTicket_IdAndStatusInAndDeletedAtIsNull(ticketId, statuses).stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<LotteryTicketSerialModel> findAllByTicketId(Long ticketId) {
        return lotteryTicketSerialRepository.findByTicket_IdAndDeletedAtIsNull(ticketId).stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepository.countByImportBatchLineId(importBatchLineId);
    }

    @Override
    public List<Long> findDistinctTicketIdsByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepository.findDistinctTicketIdsByImportBatchLineId(importBatchLineId);
    }

    @Override
    public long countByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId) {
        return lotteryTicketSerialRepository.countByTicketIdAndImportBatchLineId(ticketId, importBatchLineId);
    }

    @Override
    public void hardDeleteByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId) {
        lotteryTicketSerialRepository.deleteByTicket_IdAndImportBatchLine_Id(ticketId, importBatchLineId);
    }

    @Override
    public void hardDeleteByImportBatchLineId(Long importBatchLineId) {
        lotteryTicketSerialRepository.deleteByImportBatchLine_Id(importBatchLineId);
    }

    @Override
    public java.util.List<com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel> findAllReplacementCandidates(
            Long stationId, String numbers, java.time.LocalDate drawDate, com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus status) {
        return lotteryTicketSerialRepository.findAllReplacementCandidates(stationId, numbers, drawDate, status).stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
    }
}
