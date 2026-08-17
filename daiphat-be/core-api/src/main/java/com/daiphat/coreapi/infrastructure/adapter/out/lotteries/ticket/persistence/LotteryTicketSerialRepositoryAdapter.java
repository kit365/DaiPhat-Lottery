package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.ticket.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.LotteryTicketSerialRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.ReturnInspectableSerialData;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;
import com.daiphat.coreapi.domain.model.lotteries.SettlementStationInventoryRow;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.LotteryTicketSerialPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.LotteryTicketSerialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.HashMap;
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
    public long countSellableByTicketId(Long ticketId) {
        return lotteryTicketSerialRepository.countSellableByTicketId(ticketId);
    }

    @Override
    public Map<Long, Long> countByTicketIdsAndStatuses(
            Collection<Long> ticketIds,
            Collection<LotteryTicketSerialStatus> statuses
    ) {
        if (ticketIds == null || ticketIds.isEmpty() || statuses == null || statuses.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : lotteryTicketSerialRepository.countGroupedByTicketIdAndStatuses(ticketIds, statuses)) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }

    @Override
    public Map<Long, Long> countSellableByTicketIds(Collection<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : lotteryTicketSerialRepository.countSellableGroupedByTicketId(ticketIds)) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }

    @Override
    public Map<Long, Long> countByTicketIds(Collection<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : lotteryTicketSerialRepository.countGroupedByTicketId(ticketIds)) {
            if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
                continue;
            }
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
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
    public List<LotteryTicketSerialModel> findAllByTicketIds(Collection<Long> ticketIds) {
        if (ticketIds == null || ticketIds.isEmpty()) {
            return List.of();
        }
        return lotteryTicketSerialRepository
                .findByTicket_IdInAndDeletedAtIsNullOrderByTicket_IdAscIdAsc(List.copyOf(ticketIds))
                .stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public long countByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepository.countByImportBatchLineId(importBatchLineId);
    }

    @Override
    public long countByImportBatchLineIdAndStatus(Long importBatchLineId, LotteryTicketSerialStatus status) {
        return lotteryTicketSerialRepository.countByImportBatchLineIdAndStatus(importBatchLineId, status);
    }

    @Override
    public long countReturnEligibleByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepository.countReturnEligibleByImportBatchLineId(importBatchLineId);
    }

    @Override
    public List<Long> findDistinctTicketIdsByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepository.findDistinctTicketIdsByImportBatchLineId(importBatchLineId);
    }

    @Override
    public List<LotteryTicketSerialModel> findAllByImportBatchLineId(Long importBatchLineId) {
        return lotteryTicketSerialRepository.findAllByImportBatchLineId(importBatchLineId).stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
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

    @Override
    public List<LotteryTicketSerialModel> findAllByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return lotteryTicketSerialRepository.findByIdInAndDeletedAtIsNull(ids).stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public List<LotteryTicketSerialModel> findAllByReturnBatchLineId(Long returnBatchLineId) {
        return lotteryTicketSerialRepository.findByReturnBatchLineIdAndDeletedAtIsNull(returnBatchLineId).stream()
                .map(lotteryTicketSerialPersistenceMapper::toDomain)
                .toList();
    }

    @Override
    public Optional<LotteryTicketSerialModel> findFirstBySerialNumber(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            return Optional.empty();
        }
        return lotteryTicketSerialRepository.findFirstBySerialNumberAndDeletedAtIsNull(serialNumber.trim())
                .map(lotteryTicketSerialPersistenceMapper::toDomain);
    }

    @Override
    public long countByReturnBatchLineId(Long returnBatchLineId) {
        return lotteryTicketSerialRepository.countByReturnBatchLineIdAndDeletedAtIsNull(returnBatchLineId);
    }

    @Override
    public List<ReturnInspectableSerialData> findInStockForSupplierAndDrawDate(
            Long supplierId,
            java.time.LocalDate drawDate,
            Collection<Long> stationIds
    ) {
        boolean stationIdsEmpty = stationIds == null || stationIds.isEmpty();
        Collection<Long> ids = stationIdsEmpty ? List.of(-1L) : stationIds;
        return lotteryTicketSerialRepository
                .findInStockForSupplierAndDrawDate(supplierId, drawDate, ids, stationIdsEmpty)
                .stream()
                .map(entity -> {
                    var ticket = entity.getTicket();
                    var station = ticket != null ? ticket.getStation() : null;
                    var line = entity.getImportBatchLine();
                    return new ReturnInspectableSerialData(
                            entity.getId(),
                            entity.getSerialNumber(),
                            entity.getStatus(),
                            entity.getTicketCondition(),
                            ticket != null ? ticket.getId() : null,
                            ticket != null ? ticket.getNumbers() : null,
                            ticket != null ? ticket.getDrawDate() : null,
                            station != null ? station.getId() : null,
                            station != null ? station.getName() : null,
                            line != null ? line.getId() : null,
                            line != null ? line.getImportCost() : null,
                            ticket != null ? ticket.getPriceSnapshot() : null
                    );
                })
                .toList();
    }

    @Override
    public long countReturnEligibleForSupplierAndDrawDate(
            Long supplierId,
            java.time.LocalDate drawDate,
            Collection<Long> stationIds
    ) {
        boolean stationIdsEmpty = stationIds == null || stationIds.isEmpty();
        Collection<Long> ids = stationIdsEmpty ? List.of(-1L) : stationIds;
        return lotteryTicketSerialRepository.countReturnEligibleForSupplierAndDrawDate(
                supplierId, drawDate, ids, stationIdsEmpty
        );
    }

    @Override
    public List<SettlementStationInventoryRow> aggregateInventoryByStationForSettlement(Long settlementId) {
        if (settlementId == null) {
            return List.of();
        }
        return lotteryTicketSerialRepository.aggregateInventoryByStationForSettlement(settlementId).stream()
                .map(row -> new SettlementStationInventoryRow(
                        row[0] != null ? ((Number) row[0]).longValue() : null,
                        row[1] != null ? String.valueOf(row[1]) : null,
                        toLong(row[2]),
                        toLong(row[3]),
                        toLong(row[4]),
                        toLong(row[5]),
                        toLong(row[6]),
                        toLong(row[7]),
                        toLong(row[8]),
                        toBigDecimal(row[9])
                ))
                .toList();
    }

    private static long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }
}
