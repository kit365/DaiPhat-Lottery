package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode;
import com.daiphat.coreapi.domain.model.lotteries.LotteryTicketModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
public interface LotteryTicketRepositoryPort {

    LotteryTicketModel save(LotteryTicketModel model);

    Optional<LotteryTicketModel> findById(Long id);

    java.util.List<LotteryTicketModel> findAllByIds(Collection<Long> ids);

    Optional<LotteryTicketModel> findByUniqueFields(Long stationId, String numbers, LocalDate drawDate);

    Page<LotteryTicketModel> findAll(Pageable pageable, Long stationId, Collection<Long> stationIds,
                                     LotteryTicketStatus status, Collection<LocalDate> drawDates, String search);

    Page<LotteryTicketModel> findAllPublic(Pageable pageable, Long stationId, Collection<Long> stationIds,
                                           Collection<LocalDate> drawDates, String search);

    Page<LotteryTicketModel> findAllPublic(Pageable pageable, Long stationId, Collection<Long> stationIds,
                                           Collection<LocalDate> drawDates, String search, TicketSearchMode searchMode);

    Page<LotteryTicketModel> findAllPublic(Pageable pageable, Long stationId, Collection<Long> stationIds,
                                           Collection<LocalDate> drawDates, String search, TicketSearchMode searchMode,
                                           List<String> searches, List<String> tailRanges, List<String> numberTypes);

    java.util.List<LotteryTicketModel> findExpirableTickets(LocalDate beforeDate, Collection<LotteryTicketStatus> statuses);

    java.util.List<LotteryTicketModel> findAllByStationIdAndDrawDateAndStatuses(Long stationId, LocalDate drawDate, Collection<LotteryTicketStatus> statuses);

    void deleteById(Long id);

    boolean existsByUniqueFields(Long stationId, String numbers, LocalDate drawDate);

    boolean existsByUniqueFieldsAndIdNot(Long stationId, String numbers, LocalDate drawDate, Long id);

    long sumQuantityByProductIdAndStatuses(Long stationId, Collection<LotteryTicketStatus> statuses);

    java.util.List<com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey> findAvailableReplacementsInBulk(
            Collection<Long> stationIds, Collection<LocalDate> drawDates, Collection<String> numbers);

    java.util.List<LotteryTicketModel> findAllReplacementCandidates(
            Long stationId, String numbers, LocalDate drawDate, LotteryTicketStatus status);
}
