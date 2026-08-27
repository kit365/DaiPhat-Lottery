package com.daiphat.coreapi.domain.model.lotteries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class TrainingDatasetExportModel {

    private Long id;
    private Map<String, Object> filterJson;
    private String filePath;
    private long rowCount;
    private String status;
    private Long usedForModelId;
    private String errorMessage;
    private LocalDateTime exportedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
}
