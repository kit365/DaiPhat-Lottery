package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ImportBatchRepositoryPort {

    ImportBatchModel save(ImportBatchModel model);

    Optional<ImportBatchModel> findById(Long id);

    boolean existsByImportedByAndStatus(UUID importedBy, ImportBatchStatus status);

    boolean existsEditableBatchByImportedBy(UUID importedBy);

    Optional<ImportBatchModel> findByImportedByAndStatus(UUID importedBy, ImportBatchStatus status);

    Optional<ImportBatchModel> findEditableBatchByImportedBy(UUID importedBy);

    Optional<ImportBatchModel> findEditableBatchByImportedByAndDrawDateAndSupplierAndImportMode(
            UUID importedBy,
            LocalDate drawDate,
            Long supplierId,
            ImportBatchImportMode importMode
    );

    Page<ImportBatchModel> findAll(
            Pageable pageable,
            Long lotteryStationId,
            LocalDate drawDateFrom,
            LocalDate drawDateTo,
            ImportBatchStatus status,
            ImportBatchType batchType
    );

    List<ImportBatchModel> findDraftInDayBatchesByDrawDate(LocalDate drawDate);

    List<ImportBatchModel> findDraftBatchesWithDrawDateBefore(LocalDate today);

    List<ImportBatchModel> findIncompleteDraftBatches();

    List<ImportBatchModel> findEditableBatchesWithoutLines();

    long nextHeaderBatchCodeSequence();

    boolean existsNonCancelledBySupplierAndDrawDate(Long supplierId, LocalDate drawDate);

    List<ImportBatchModel> findBySupplierSettlementId(Long supplierSettlementId);
}
