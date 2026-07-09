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

    Optional<ImportBatchLineEntity> findByImportBatch_IdAndLotteryStation_IdAndDeletedAtIsNotNull(
            Long importBatchId,
            Long lotteryStationId
    );

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

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE l.lotteryStation.id = :stationId
              AND b.drawDate = :drawDate
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            """)
    boolean existsDraftLineForStationAndDrawDate(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate
    );

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE l.lotteryStation.id = :stationId
              AND b.drawDate = :drawDate
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.IMPORTED,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.IN_LEDGER
              )
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            """)
    boolean existsNonDraftLineForStationAndDrawDate(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate
    );

    @Query("""
            SELECT b.id
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE l.lotteryStation.id = :stationId
              AND b.drawDate = :drawDate
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            ORDER BY b.id ASC
            """)
    List<Long> findDraftBatchIdsForStationAndDrawDate(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate
    );

    @Query("""
            SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE l.lotteryStation.id = :stationId
              AND b.drawDate = :drawDate
              AND b.id <> :excludeBatchId
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            """)
    boolean existsDraftLineForStationAndDrawDateExcludingBatch(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate,
            @Param("excludeBatchId") Long excludeBatchId
    );

    @Query("""
            SELECT b.id
            FROM ImportBatchLineEntity l
            JOIN l.importBatch b
            WHERE l.lotteryStation.id = :stationId
              AND b.drawDate = :drawDate
              AND b.id <> :excludeBatchId
              AND b.status IN (
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                  com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
              AND l.deletedAt IS NULL
              AND b.deletedAt IS NULL
            ORDER BY b.id ASC
            """)
    List<Long> findDraftBatchIdsForStationAndDrawDateExcludingBatch(
            @Param("stationId") Long stationId,
            @Param("drawDate") LocalDate drawDate,
            @Param("excludeBatchId") Long excludeBatchId
    );

    long countByImportBatch_IdAndDeletedAtIsNull(Long importBatchId);

    @Query(value = "SELECT nextval('import_batch_code_seq')", nativeQuery = true)
    long nextBatchCodeSequence();
}
