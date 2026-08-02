package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketSerialModel;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface LotteryTicketSerialRepositoryPort {

    LotteryTicketSerialModel save(LotteryTicketSerialModel model);

    Optional<LotteryTicketSerialModel> findById(Long id);

    Optional<LotteryTicketSerialModel> findFirstByTicketIdOrderByIdAsc(Long ticketId);

    Map<Long, LotteryTicketSerialModel> findRepresentativeSerialsByTicketIds(List<Long> ticketIds);

    Optional<LotteryTicketSerialModel> findFirstByTicketIdAndStatusOrderByIdAsc(Long ticketId, LotteryTicketSerialStatus status);

    boolean existsByTicketIdAndSerialNumber(Long ticketId, String serialNumber);

    long countByTicketIdAndStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    long countSellableByTicketId(Long ticketId);

    Map<Long, Long> countByTicketIdsAndStatuses(Collection<Long> ticketIds, Collection<LotteryTicketSerialStatus> statuses);

    Map<Long, Long> countSellableByTicketIds(Collection<Long> ticketIds);

    Map<Long, Long> countByTicketIds(Collection<Long> ticketIds);

    List<LotteryTicketSerialModel> findByTicketIdAndStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    List<LotteryTicketSerialModel> findAllByTicketId(Long ticketId);

    long countByImportBatchLineId(Long importBatchLineId);

    long countByImportBatchLineIdAndStatus(Long importBatchLineId, LotteryTicketSerialStatus status);

    /** IN_STOCK|EXPIRED + GOOD + not linked to a return line. */
    long countReturnEligibleByImportBatchLineId(Long importBatchLineId);

    List<Long> findDistinctTicketIdsByImportBatchLineId(Long importBatchLineId);

    List<LotteryTicketSerialModel> findAllByImportBatchLineId(Long importBatchLineId);

    long countByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId);

    void hardDeleteByTicketIdAndImportBatchLineId(Long ticketId, Long importBatchLineId);

    void hardDeleteByImportBatchLineId(Long importBatchLineId);

    java.util.List<LotteryTicketSerialModel> findAllReplacementCandidates(
            Long stationId, String numbers, java.time.LocalDate drawDate, com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketSerialStatus status
    );

    List<LotteryTicketSerialModel> findAllByIds(Collection<Long> ids);

    List<LotteryTicketSerialModel> findAllByReturnBatchLineId(Long returnBatchLineId);

    long countByReturnBatchLineId(Long returnBatchLineId);

    List<ReturnInspectableSerialData> findInStockForSupplierAndDrawDate(
            Long supplierId,
            java.time.LocalDate drawDate,
            Collection<Long> stationIds
    );
}
