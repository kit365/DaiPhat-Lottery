package com.daiphat.coreapi.infrastructure.adapter.out.lotteries.aimodel.persistence;

import com.daiphat.coreapi.application.port.out.lotteries.AiModelMetricRepositoryPort;
import com.daiphat.coreapi.domain.model.lotteries.AiModelMetricModel;
import com.daiphat.coreapi.infrastructure.persistence.entity.lotteries.AiModelMetricEntity;
import com.daiphat.coreapi.infrastructure.persistence.mapper.lotteries.AiModelPersistenceMapper;
import com.daiphat.coreapi.infrastructure.persistence.repository.lotteries.AiModelMetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class AiModelMetricRepositoryAdapter implements AiModelMetricRepositoryPort {

    private final AiModelMetricRepository repository;
    private final AiModelPersistenceMapper mapper;

    @Override
    public AiModelMetricModel save(AiModelMetricModel model) {
        return mapper.toDomain(repository.save(mapper.toEntity(model)));
    }

    @Override
    public List<AiModelMetricModel> findByModelAndDateRange(Long modelId, LocalDate from, LocalDate to) {
        return repository
                .findByModelIdAndMetricDateBetweenAndDeletedAtIsNullOrderByMetricDateAscFieldNameAsc(
                        modelId, from, to
                )
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    public int aggregateAndUpsertForDate(LocalDate metricDate) {
        List<Object[]> rows = repository.aggregateFieldMetricsForDate(metricDate);
        int upserted = 0;
        for (Object[] row : rows) {
            Long modelId = ((Number) row[0]).longValue();
            LocalDate date = row[1] instanceof Date sqlDate
                    ? sqlDate.toLocalDate()
                    : (LocalDate) row[1];
            String fieldName = (String) row[2];
            long total = ((Number) row[3]).longValue();
            long corrected = row[4] == null ? 0L : ((Number) row[4]).longValue();
            Double avgConfidence = null;
            if (row[5] instanceof BigDecimal bd) {
                avgConfidence = bd.doubleValue();
            } else if (row[5] instanceof Number n) {
                avgConfidence = n.doubleValue();
            }

            AiModelMetricEntity entity = repository
                    .findByModelIdAndMetricDateAndFieldNameAndDeletedAtIsNull(modelId, date, fieldName)
                    .orElseGet(AiModelMetricEntity::new);
            entity.setModelId(modelId);
            entity.setMetricDate(date);
            entity.setFieldName(fieldName);
            entity.setTotalFields(total);
            entity.setCorrectedFields(corrected);
            entity.setAvgAiConfidence(avgConfidence);
            repository.save(entity);
            upserted++;
        }
        return upserted;
    }
}
