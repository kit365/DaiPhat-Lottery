package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.LotteryResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LotteryResultRepository extends JpaRepository<LotteryResultEntity, Long> {

    Optional<LotteryResultEntity> findByIdAndDeletedAtIsNull(Long id);

    Page<LotteryResultEntity> findAllByDeletedAtIsNullOrderByDrawDateDescIdDesc(Pageable pageable);

    Optional<LotteryResultEntity> findByStation_IdAndDrawDateAndDeletedAtIsNull(Long stationId, LocalDate drawDate);

    boolean existsByStation_IdAndDrawDateAndDeletedAtIsNull(Long stationId, LocalDate drawDate);

    boolean existsByStation_IdAndDrawDateAndDeletedAtIsNullAndIdNot(Long stationId, LocalDate drawDate, Long id);

    List<LotteryResultEntity> findByStation_IdAndDeletedAtIsNullOrderByDrawDateDesc(Long stationId);

    @Modifying
    @Query("""
            update LotteryResultEntity result
            set result.requestedAt = :requestedAt,
                result.updatedAt = :requestedAt
            where result.id = :id
              and result.deletedAt is null
            """)
    int updateRequestedAt(
            @Param("id") Long id,
            @Param("requestedAt") LocalDateTime requestedAt
    );

    @Modifying
    @Query("""
            update LotteryResultEntity result
            set result.status = :nextStatus,
                result.source = :source,
                result.updatedAt = :updatedAt,
                result.lastModifiedBy = :lastModifiedBy
            where result.id = :id
              and result.deletedAt is null
              and result.status in :allowedStatuses
            """)
    int updateStatusIfCurrentIn(
            @Param("id") Long id,
            @Param("allowedStatuses") List<com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus> allowedStatuses,
            @Param("nextStatus") com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus nextStatus,
            @Param("source") String source,
            @Param("updatedAt") LocalDateTime updatedAt,
            @Param("lastModifiedBy") String lastModifiedBy
    );

    @Query("""
            select result
            from LotteryResultEntity result
            left join result.details detail with detail.deletedAt is null
            where result.deletedAt is null
              and result.drawDate <= :upToDate
              and result.status in :statuses
            group by result
            having count(detail.id) = 0
            order by
                case when result.requestedAt is null then 1 else 0 end,
                result.requestedAt desc,
                result.drawDate desc,
                result.id desc
            """)
    List<LotteryResultEntity> findHistoricalResultsWithoutDetails(
            @Param("upToDate") LocalDate upToDate,
            @Param("statuses") List<com.daiphat.coreapi.domain.model.enums.lottery.LotteryResultStatus> statuses,
            Pageable pageable
    );
}
