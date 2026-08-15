package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchFileImportJobEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ImportBatchFileImportJobRepository
        extends JpaRepository<ImportBatchFileImportJobEntity, Long> {

    Page<ImportBatchFileImportJobEntity> findByDeletedAtIsNull(Pageable pageable);

    Page<ImportBatchFileImportJobEntity> findBySupplierIdAndDeletedAtIsNull(
            Long supplierId,
            Pageable pageable
    );

    Page<ImportBatchFileImportJobEntity> findByImportedByAndDeletedAtIsNull(
            UUID importedBy,
            Pageable pageable
    );
}
