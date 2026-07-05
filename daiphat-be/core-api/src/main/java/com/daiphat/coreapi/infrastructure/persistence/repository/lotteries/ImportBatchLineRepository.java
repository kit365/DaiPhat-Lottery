package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchLineEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ImportBatchLineRepository extends JpaRepository<ImportBatchLineEntity, Long> {

    List<ImportBatchLineEntity> findByImportBatch_IdAndDeletedAtIsNull(Long importBatchId);

    Optional<ImportBatchLineEntity> findByIdAndDeletedAtIsNull(Long id);

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE l.lotteryStation.id = :stationId
              AND b.drawDate = :drawDate
              AND l.batchType = :batchType
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            """)
    boolean existsByStationAndDrawDateAndBatchType(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate,
            @Param("batchType") ImportBatchType batchType
    );

    @Query(value = "SELECT nextval('import_batch_code_seq')", nativeQuery = true)
    long nextBatchCodeSequence();
}
