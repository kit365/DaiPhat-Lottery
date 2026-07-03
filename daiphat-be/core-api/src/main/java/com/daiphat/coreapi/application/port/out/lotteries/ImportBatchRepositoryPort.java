package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.domain.model.lotteries.ImportBatchModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

public interface ImportBatchRepositoryPort {

    ImportBatchModel save(ImportBatchModel model);

    Optional<ImportBatchModel> findById(Long id);

    boolean existsByImportedByAndStatus(UUID importedBy, ImportBatchStatus status);

    Optional<ImportBatchModel> findByImportedByAndStatus(UUID importedBy, ImportBatchStatus status);

    Page<ImportBatchModel> findAll(
            Pageable pageable,
            Long lotteryStationId,
            LocalDate drawDate,
            ImportBatchStatus status,
            ImportBatchType batchType
    );
}
