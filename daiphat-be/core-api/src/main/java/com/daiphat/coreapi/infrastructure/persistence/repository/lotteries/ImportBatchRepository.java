package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportBatchRepository extends JpaRepository<ImportBatchEntity, Long>, JpaSpecificationExecutor<ImportBatchEntity> {

    Optional<ImportBatchEntity> findByBatchCodeAndDeletedAtIsNull(String batchCode);

    List<ImportBatchEntity> findByBatchCodeStartingWithAndDeletedAtIsNull(String batchCodePrefix);

    boolean existsByImportedBy_IdAndStatus(UUID importedBy, ImportBatchStatus status);

    Optional<ImportBatchEntity> findFirstByImportedBy_IdAndStatusOrderByImportedAtDesc(
            UUID importedBy,
            ImportBatchStatus status
    );

    @Query("""
            SELECT b FROM ImportBatchEntity b
            WHERE b.status IN (
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
            )
              AND b.drawDate = :drawDate
              AND b.importMode = com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode.IN_DAY
              AND b.deletedAt IS NULL
            """)
    List<ImportBatchEntity> findDraftInDayBatchesByDrawDate(@Param("drawDate") LocalDate drawDate);

    @Query("""
            SELECT b FROM ImportBatchEntity b
            WHERE b.status IN (
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
            )
              AND b.drawDate < :today
              AND b.deletedAt IS NULL
            """)
    List<ImportBatchEntity> findDraftBatchesWithDrawDateBefore(@Param("today") LocalDate today);

    @Query("""
            SELECT DISTINCT b FROM ImportBatchEntity b
            JOIN b.lines l
            WHERE b.deletedAt IS NULL
              AND l.deletedAt IS NULL
              AND b.status IN (
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
              AND l.status NOT IN (
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus.IMPORTED,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchLineStatus.CANCELLED
              )
            ORDER BY b.drawDate DESC, b.importedAt DESC
            """)
    List<ImportBatchEntity> findIncompleteDraftBatches();

    @Query("""
            SELECT b FROM ImportBatchEntity b
            WHERE b.deletedAt IS NULL
              AND b.status IN (
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
              AND NOT EXISTS (
                SELECT 1 FROM ImportBatchLineEntity l
                WHERE l.importBatch.id = b.id
                  AND l.deletedAt IS NULL
              )
            ORDER BY b.drawDate DESC, b.importedAt DESC
            """)
    List<ImportBatchEntity> findEditableBatchesWithoutLines();

    @Query("""
            SELECT b FROM ImportBatchEntity b
            WHERE b.deletedAt IS NULL
              AND b.importedBy.id = :importedBy
              AND b.drawDate = :drawDate
              AND b.supplier.id = :supplierId
              AND b.importMode = :importMode
              AND b.status IN (
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.RECEIVING,
                com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.PARTIALLY_IMPORTED
              )
            ORDER BY b.importedAt DESC
            """)
    List<ImportBatchEntity> findEditableBatchesByImportedByAndDrawDateAndSupplierAndImportMode(
            @Param("importedBy") UUID importedBy,
            @Param("drawDate") LocalDate drawDate,
            @Param("supplierId") Long supplierId,
            @Param("importMode") ImportBatchImportMode importMode
    );

    Optional<ImportBatchEntity> findFirstByImportedBy_IdAndStatusInOrderByImportedAtDesc(
            UUID importedBy,
            Collection<ImportBatchStatus> statuses
    );

    boolean existsByImportedBy_IdAndStatusIn(UUID importedBy, Collection<ImportBatchStatus> statuses);

    @Query(value = "SELECT nextval('import_batch_header_code_seq')", nativeQuery = true)
    long nextHeaderBatchCodeSequence();

    @Query("""
            SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
            FROM ImportBatchEntity b
            WHERE b.supplier.id = :supplierId
              AND b.drawDate = :drawDate
              AND b.deletedAt IS NULL
              AND b.status <> com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.CANCELLED
            """)
    boolean existsNonCancelledBySupplierAndDrawDate(
            @Param("supplierId") Long supplierId,
            @Param("drawDate") LocalDate drawDate
    );

    List<ImportBatchEntity> findBySupplierSettlementIdAndDeletedAtIsNullOrderByDrawDateDescIdDesc(
            Long supplierSettlementId
    );
}
