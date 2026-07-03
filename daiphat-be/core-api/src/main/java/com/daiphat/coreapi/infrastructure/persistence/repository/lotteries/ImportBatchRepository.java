package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.ImportBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface ImportBatchRepository extends JpaRepository<ImportBatchEntity, Long>, JpaSpecificationExecutor<ImportBatchEntity> {

    boolean existsByImportedBy_IdAndStatus(UUID importedBy, ImportBatchStatus status);

    Optional<ImportBatchEntity> findFirstByImportedBy_IdAndStatusOrderByImportedAtDesc(
            UUID importedBy,
            ImportBatchStatus status
    );
}
