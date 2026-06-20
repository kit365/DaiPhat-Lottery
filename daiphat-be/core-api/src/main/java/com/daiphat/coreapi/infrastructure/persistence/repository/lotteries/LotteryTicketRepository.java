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
            select coalesce(sum(t.quantity), 0)
            from LotteryTicketEntity t
            where t.station.id = :productId
              and t.status in :statuses
              and t.deletedAt is null
            """)
    long sumQuantityByStationIdAndStatusInAndDeletedAtIsNull(
            @Param("productId") Long productId,
            @Param("statuses") Collection<LotteryTicketStatus> statuses
    );
}
