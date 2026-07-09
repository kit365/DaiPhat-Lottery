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

    List<LotteryTicketSerialModel> findByTicketIdAndStatuses(Long ticketId, Collection<LotteryTicketSerialStatus> statuses);

    List<LotteryTicketSerialModel> findAllByTicketId(Long ticketId);

    long countByImportBatchLineId(Long importBatchLineId);

    List<Long> findDistinctTicketIdsByImportBatchLineId(Long importBatchLineId);

    void hardDeleteByImportBatchLineId(Long importBatchLineId);
}
