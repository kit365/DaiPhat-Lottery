package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.TrainingDatasetExportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainingDatasetExportRepository extends JpaRepository<TrainingDatasetExportEntity, Long> {

    Optional<TrainingDatasetExportEntity> findByIdAndDeletedAtIsNull(Long id);

    List<TrainingDatasetExportEntity> findByDeletedAtIsNullOrderByCreatedAtDesc();
}
