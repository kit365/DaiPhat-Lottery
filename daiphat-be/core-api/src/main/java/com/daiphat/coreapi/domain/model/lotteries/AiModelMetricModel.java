package com.daiphat.coreapi.domain.model.lotteries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AiModelMetricModel {

    private Long id;
    private Long modelId;
    private LocalDate metricDate;
    private String fieldName;
    private long totalFields;
    private long correctedFields;
    private Double avgAiConfidence;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
