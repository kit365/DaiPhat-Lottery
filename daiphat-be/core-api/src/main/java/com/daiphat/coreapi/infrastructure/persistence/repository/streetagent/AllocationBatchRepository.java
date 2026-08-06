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
    @Query("select b from AllocationBatchEntity b where b.id = :id")
    Optional<AllocationBatchEntity> findByIdForUpdate(@Param("id") Long id);

    boolean existsByStreetAgentProfile_IdAndStatusIn(Long profileId, Collection<AllocationBatchStatus> statuses);

    Optional<AllocationBatchEntity> findFirstByStreetAgentProfile_IdAndStatusInOrderByCreatedAtDesc(
            Long profileId, Collection<AllocationBatchStatus> statuses);

    @Query("select coalesce(sum(b.allocatedQuantity),0) from AllocationBatchEntity b where b.streetAgentProfile.id=:profileId and b.businessDate=:date and b.status in :statuses")
    long sumAllocatedForDay(@Param("profileId") Long profileId, @Param("date") LocalDate date,
                            @Param("statuses") Collection<AllocationBatchStatus> statuses);

    @Query("select b from AllocationBatchEntity b where b.status = com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus.DRAFT and b.reservationExpiresAt <= :now")
    List<AllocationBatchEntity> findExpiredDrafts(@Param("now") java.time.LocalDateTime now);

    @Query("select b from AllocationBatchEntity b where b.status = com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus.DRAFT")
    List<AllocationBatchEntity> findAllDrafts();
}
