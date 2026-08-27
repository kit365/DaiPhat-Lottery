package com.daiphat.coreapi.infrastructure.persistence.repository.lotteries;

import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AiModelMetricEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AiModelMetricRepository extends JpaRepository<AiModelMetricEntity, Long> {

    Optional<AiModelMetricEntity> findByModelIdAndMetricDateAndFieldNameAndDeletedAtIsNull(
            Long modelId,
            LocalDate metricDate,
            String fieldName
    );

    List<AiModelMetricEntity> findByModelIdAndMetricDateBetweenAndDeletedAtIsNullOrderByMetricDateAscFieldNameAsc(
            Long modelId,
            LocalDate from,
            LocalDate to
    );

    @Query(value = """
            SELECT r.ai_model_id AS modelId,
                   CAST(f.created_at AS DATE) AS metricDate,
                   f.field_name AS fieldName,
                   COUNT(*) AS totalFields,
                   SUM(CASE WHEN f.is_corrected THEN 1 ELSE 0 END) AS correctedFields,
                   AVG(f.ai_confidence) AS avgAiConfidence
            FROM ocr_scan_result_fields f
            JOIN ocr_scan_results r ON r.id = f.ocr_scan_result_id
            WHERE f.deleted_at IS NULL
              AND r.deleted_at IS NULL
              AND r.ai_model_id IS NOT NULL
              AND CAST(f.created_at AS DATE) = :metricDate
            GROUP BY r.ai_model_id, CAST(f.created_at AS DATE), f.field_name
            """, nativeQuery = true)
    List<Object[]> aggregateFieldMetricsForDate(@Param("metricDate") LocalDate metricDate);
}
