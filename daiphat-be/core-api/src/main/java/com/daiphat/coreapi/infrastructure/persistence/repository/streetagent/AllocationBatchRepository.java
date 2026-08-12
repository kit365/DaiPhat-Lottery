package com.daiphat.coreapi.infrastructure.persistence.repository.streetagent;

import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.streetagent.AllocationBatchEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.*;

public interface AllocationBatchRepository extends JpaRepository<AllocationBatchEntity, Long>, JpaSpecificationExecutor<AllocationBatchEntity> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from AllocationBatchEntity b where b.id = :id and b.deletedAt is null")
    Optional<AllocationBatchEntity> findByIdForUpdate(@Param("id") Long id);

    @Query("select coalesce(sum(b.allocatedQuantity),0) from AllocationBatchEntity b where b.streetAgentProfile.id=:profileId and b.businessDate=:date and b.status in :statuses and b.deletedAt is null")
    long sumAllocatedForDay(@Param("profileId") Long profileId, @Param("date") LocalDate date,
                            @Param("statuses") Collection<AllocationBatchStatus> statuses);

    @Query("""
            select case when count(b) > 0 then true else false end
            from AllocationBatchEntity b
            where b.streetAgentProfile.id = :profileId
              and b.businessDate = :businessDate
              and b.status in :statuses
              and b.deletedAt is null
            """)
    boolean existsOpenBatchForDate(
            @Param("profileId") Long profileId,
            @Param("businessDate") LocalDate businessDate,
            @Param("statuses") Collection<AllocationBatchStatus> statuses);

    @Query("""
            select case when count(b) > 0 then true else false end
            from AllocationBatchEntity b
            where b.streetAgentProfile.id = :profileId
              and b.status in :statuses
              and b.deletedAt is null
            """)
    boolean existsByStreetAgentProfile_IdAndStatusIn(
            @Param("profileId") Long profileId,
            @Param("statuses") Collection<AllocationBatchStatus> statuses);

    @Query("select b from AllocationBatchEntity b where b.streetAgentProfile.id = :profileId and b.status in :statuses and b.deletedAt is null order by b.createdAt desc")
    List<AllocationBatchEntity> findOpenByProfileId(
            @Param("profileId") Long profileId, @Param("statuses") Collection<AllocationBatchStatus> statuses, Pageable pageable);

    @Query("""
            select b from AllocationBatchEntity b
            left join fetch b.details
            where b.streetAgentProfile.id = :profileId
              and b.businessDate = :date
              and b.status in :statuses
              and b.deletedAt is null
            """)
    List<AllocationBatchEntity> findByProfileAndDateAndStatuses(
            @Param("profileId") Long profileId,
            @Param("date") LocalDate date,
            @Param("statuses") Collection<AllocationBatchStatus> statuses);

    @Query("""
            select b from AllocationBatchEntity b
            where b.streetAgentProfile.id = :profileId
              and b.status in :statuses
              and b.deletedAt is null
            order by b.settledAt desc nulls last, b.id desc
            """)
    List<AllocationBatchEntity> findLastTerminalBatches(
            @Param("profileId") Long profileId,
            @Param("statuses") Collection<AllocationBatchStatus> statuses,
            Pageable pageable);

    @Query("select b from AllocationBatchEntity b where b.status = com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus.DRAFT and b.reservationExpiresAt <= :now and b.deletedAt is null")
    List<AllocationBatchEntity> findExpiredDrafts(@Param("now") java.time.LocalDateTime now);

    @Query("select b from AllocationBatchEntity b where b.status = com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus.DRAFT and b.deletedAt is null")
    List<AllocationBatchEntity> findAllDrafts();
}
