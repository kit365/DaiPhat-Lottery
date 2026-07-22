package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryTicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
public interface LotteryTicketRepository
        extends JpaRepository<LotteryTicketEntity, Long>,
        JpaSpecificationExecutor<LotteryTicketEntity> {

    boolean existsByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
            Long productId,
            String numbers,
            LocalDate drawDate);

    boolean existsByStation_IdAndNumbersAndDrawDateAndIdNotAndDeletedAtIsNull(
            Long productId,
            String numbers,
            LocalDate drawDate,
            Long id);

    java.util.Optional<LotteryTicketEntity> findByStation_IdAndNumbersAndDrawDateAndDeletedAtIsNull(
            Long productId,
            String numbers,
            LocalDate drawDate
    );

    List<LotteryTicketEntity> findAllByIdInAndDeletedAtIsNull(Collection<Long> ids);

    List<LotteryTicketEntity> findAllByDrawDateLessThanEqualAndStatusInAndDeletedAtIsNull(LocalDate drawDate, Collection<LotteryTicketStatus> statuses);

    List<LotteryTicketEntity> findAllByStation_IdAndDrawDateAndStatusInAndDeletedAtIsNull(
            Long stationId,
            LocalDate drawDate,
            Collection<LotteryTicketStatus> statuses
    );

    @Query("""
            select count(s.id)
            from LotteryTicketEntity t
            join t.serials s
            where t.station.id = :productId
              and t.status in :statuses
              and s.status = 'IN_STOCK'
              and t.deletedAt is null
            """)
    long sumQuantityByStationIdAndStatusInAndDeletedAtIsNull(
            @Param("productId") Long productId,
            @Param("statuses") Collection<LotteryTicketStatus> statuses
    );
    @Query("""
            select new com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey(s.ticket.station.id, s.ticket.numbers, s.ticket.drawDate)
            from LotteryTicketSerialEntity s
            where s.status = 'IN_STOCK'
              and s.deletedAt is null
              and s.ticket.drawDate in :drawDates
              and s.ticket.station.id in :stationIds
              and s.ticket.numbers in :numbers
            group by s.ticket.station.id, s.ticket.numbers, s.ticket.drawDate
            """)
    List<com.daiphat.coreapi.application.dto.lotteries.TicketAvailabilityKey> findAvailableReplacementsInBulk(
            @Param("stationIds") Collection<Long> stationIds,
            @Param("drawDates") Collection<LocalDate> drawDates,
            @Param("numbers") Collection<String> numbers);

    List<LotteryTicketEntity> findAllByStation_IdAndNumbersAndDrawDateAndStatusAndDeletedAtIsNull(
            Long stationId,
            String numbers,
            LocalDate drawDate,
            LotteryTicketStatus status);
}
