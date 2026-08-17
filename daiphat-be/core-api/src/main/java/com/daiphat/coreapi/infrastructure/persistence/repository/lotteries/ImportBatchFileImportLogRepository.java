package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchFileImportLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ImportBatchFileImportLogRepository extends JpaRepository<ImportBatchFileImportLogEntity, Long> {

    boolean existsByFileHashAndSupplierIdAndDrawDateAndImportedBy(
            String fileHash,
            Long supplierId,
            LocalDate drawDate,
            UUID importedBy
    );

    List<ImportBatchFileImportLogEntity> findByFileHashAndSupplierIdAndImportedBy(
            String fileHash,
            Long supplierId,
            UUID importedBy
    );

    List<ImportBatchFileImportLogEntity> findByImportBatchIdInAndDeletedAtIsNull(Collection<Long> importBatchIds);
}
