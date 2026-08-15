package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchFileMappingProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ImportBatchFileMappingProfileRepository
        extends JpaRepository<ImportBatchFileMappingProfileEntity, Long> {

    Optional<ImportBatchFileMappingProfileEntity> findBySupplierIdAndHeaderSignatureAndDeletedAtIsNull(
            Long supplierId,
            String headerSignature
    );

    List<ImportBatchFileMappingProfileEntity> findBySupplierIdAndDeletedAtIsNullOrderByLastUsedAtDesc(
            Long supplierId
    );

    List<ImportBatchFileMappingProfileEntity> findByDeletedAtIsNullOrderByLastUsedAtDesc();
}
