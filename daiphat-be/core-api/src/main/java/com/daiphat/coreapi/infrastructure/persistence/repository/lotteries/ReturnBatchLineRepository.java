package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ReturnBatchLineEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReturnBatchLineRepository extends JpaRepository<ReturnBatchLineEntity, Long> {

    Optional<ReturnBatchLineEntity> findByIdAndDeletedAtIsNull(Long id);

    List<ReturnBatchLineEntity> findByReturnBatch_IdAndDeletedAtIsNull(Long returnBatchId);

    Optional<ReturnBatchLineEntity> findByReturnBatch_IdAndLotteryStation_IdAndDeletedAtIsNull(
            Long returnBatchId,
            Long lotteryStationId
    );
}
