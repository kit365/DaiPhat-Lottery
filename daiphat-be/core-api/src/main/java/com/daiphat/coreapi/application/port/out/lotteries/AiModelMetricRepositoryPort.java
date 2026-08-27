package com.daiphat.coreapi.application.port.out.lotteries;

import com.daiphat.coreapi.domain.model.lotteries.AiModelMetricModel;

import java.time.LocalDate;
import java.util.List;

public interface AiModelMetricRepositoryPort {

    AiModelMetricModel save(AiModelMetricModel model);

    List<AiModelMetricModel> findByModelAndDateRange(Long modelId, LocalDate from, LocalDate to);

    int aggregateAndUpsertForDate(LocalDate metricDate);
}
