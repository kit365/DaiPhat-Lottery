package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportBatchRepository extends JpaRepository<ImportBatchEntity, Long>, JpaSpecificationExecutor<ImportBatchEntity> {

    boolean existsByImportedBy_IdAndStatus(UUID importedBy, ImportBatchStatus status);

    Optional<ImportBatchEntity> findFirstByImportedBy_IdAndStatusOrderByImportedAtDesc(
            UUID importedBy,
            ImportBatchStatus status
    );

    @Query("""
            SELECT b FROM ImportBatchEntity b
            WHERE b.status = com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT
              AND b.drawDate = :drawDate
              AND b.importMode = com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode.IN_DAY
            """)
    List<ImportBatchEntity> findDraftInDayBatchesByDrawDate(@Param("drawDate") LocalDate drawDate);

    @Query("""
            SELECT b FROM ImportBatchEntity b
            WHERE b.status = com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus.DRAFT
              AND b.drawDate < :today
            """)
    List<ImportBatchEntity> findDraftBatchesWithDrawDateBefore(@Param("today") LocalDate today);

    @Query(value = "SELECT nextval('import_batch_header_code_seq')", nativeQuery = true)
    long nextHeaderBatchCodeSequence();
}
