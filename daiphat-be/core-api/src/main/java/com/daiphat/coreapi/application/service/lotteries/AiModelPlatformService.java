package com.daiphat.coreapi.application.service.lotteries;

import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateTrainingDatasetExportRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.AiModelMetricResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.AiModelRegistryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TrainingDatasetExportResponse;
import com.daiphat.coreapi.application.port.out.lotteries.AiModelMetricRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.AiModelRegistryRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultFieldRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.OcrScanResultRepositoryPort;
import com.daiphat.coreapi.application.port.out.lotteries.TrainingDatasetExportRepositoryPort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.lotteries.AiModelMetricModel;
import com.daiphat.coreapi.domain.model.lotteries.AiModelRegistryModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultFieldModel;
import com.daiphat.coreapi.domain.model.lotteries.OcrScanResultModel;
import com.daiphat.coreapi.domain.model.lotteries.TrainingDatasetExportModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiModelPlatformService {

    private final AiModelRegistryRepositoryPort registryRepositoryPort;
    private final AiModelMetricRepositoryPort metricRepositoryPort;
    private final TrainingDatasetExportRepositoryPort exportRepositoryPort;
    private final OcrScanResultRepositoryPort ocrScanResultRepositoryPort;
    private final OcrScanResultFieldRepositoryPort fieldRepositoryPort;
    private final ObjectMapper objectMapper;

    @Value("${daiphat.ocr.training-export-dir:./data/ocr-training-exports}")
    private String trainingExportDir;

    @Transactional(readOnly = true)
    public List<AiModelRegistryResponse> listModels() {
        return registryRepositoryPort.findAllActive().stream()
                .map(this::toModelResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AiModelMetricResponse> listMetrics(Long modelId, LocalDate from, LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        LocalDate start = from != null ? from : end.minusDays(30);
        return metricRepositoryPort.findByModelAndDateRange(modelId, start, end).stream()
                .map(this::toMetricResponse)
                .toList();
    }

    @Transactional
    public int aggregateMetricsForDate(LocalDate metricDate) {
        LocalDate date = metricDate != null ? metricDate : LocalDate.now().minusDays(1);
        int upserted = metricRepositoryPort.aggregateAndUpsertForDate(date);
        log.info("AI model metrics aggregated for {}: {} rows", date, upserted);
        return upserted;
    }

    @Transactional
    public TrainingDatasetExportResponse createExport(CreateTrainingDatasetExportRequest request) {
        Map<String, Object> filter = new LinkedHashMap<>();
        if (request.fromDate() != null) {
            filter.put("fromDate", request.fromDate().toString());
        }
        if (request.toDate() != null) {
            filter.put("toDate", request.toDate().toString());
        }
        if (request.correctedOnly() != null) {
            filter.put("correctedOnly", request.correctedOnly());
        }
        if (request.usedForModelId() != null) {
            filter.put("usedForModelId", request.usedForModelId());
        }
        if (request.extraFilters() != null) {
            filter.putAll(request.extraFilters());
        }

        TrainingDatasetExportModel pending = exportRepositoryPort.save(
                TrainingDatasetExportModel.builder()
                        .filterJson(filter)
                        .status("PENDING")
                        .rowCount(0)
                        .usedForModelId(request.usedForModelId())
                        .build()
        );

        try {
            List<Map<String, Object>> rows = collectExportRows(request);
            Path dir = Path.of(trainingExportDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path file = dir.resolve("export-" + pending.getId() + ".jsonl");
            StringBuilder sb = new StringBuilder();
            for (Map<String, Object> row : rows) {
                sb.append(objectMapper.writeValueAsString(row)).append('\n');
            }
            Files.writeString(file, sb.toString(), StandardCharsets.UTF_8);

            pending.setFilePath(file.toString());
            pending.setRowCount(rows.size());
            pending.setStatus("COMPLETED");
            pending.setExportedAt(LocalDateTime.now());
            pending.setErrorMessage(null);
            return toExportResponse(exportRepositoryPort.save(pending));
        } catch (Exception e) {
            log.error("Training dataset export {} failed", pending.getId(), e);
            pending.setStatus("FAILED");
            pending.setErrorMessage(e.getMessage() != null ? e.getMessage().substring(0, Math.min(500, e.getMessage().length())) : "export failed");
            return toExportResponse(exportRepositoryPort.save(pending));
        }
    }

    @Transactional(readOnly = true)
    public List<TrainingDatasetExportResponse> listExports() {
        return exportRepositoryPort.findAll().stream().map(this::toExportResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrainingDatasetExportResponse getExport(Long id) {
        return exportRepositoryPort.findById(id)
                .map(this::toExportResponse)
                .orElseThrow(() -> new DomainException(ErrorCode.INVALID_INPUT, "Export không tồn tại."));
    }

    private List<Map<String, Object>> collectExportRows(CreateTrainingDatasetExportRequest request) {
        List<Map<String, Object>> rows = new ArrayList<>();
        Long importBatchLineId = null;
        String scanId = null;
        if (request.extraFilters() != null) {
            Object line = request.extraFilters().get("importBatchLineId");
            if (line instanceof Number n) {
                importBatchLineId = n.longValue();
            }
            Object sid = request.extraFilters().get("scanId");
            if (sid != null) {
                scanId = String.valueOf(sid);
            }
        }

        List<OcrScanResultModel> results;
        if (scanId != null || importBatchLineId != null) {
            results = ocrScanResultRepositoryPort.findAll(scanId, importBatchLineId);
        } else if (request.usedForModelId() != null) {
            results = ocrScanResultRepositoryPort.findByAiModelId(request.usedForModelId());
        } else {
            return rows;
        }

        boolean correctedOnly = Boolean.TRUE.equals(request.correctedOnly());
        LocalDate from = request.fromDate();
        LocalDate to = request.toDate();
        for (OcrScanResultModel result : results) {
            if (request.usedForModelId() != null
                    && (result.getAiModelId() == null || !request.usedForModelId().equals(result.getAiModelId()))) {
                continue;
            }
            if (result.getScannedAt() != null) {
                LocalDate scanned = result.getScannedAt().toLocalDate();
                if (from != null && scanned.isBefore(from)) {
                    continue;
                }
                if (to != null && scanned.isAfter(to)) {
                    continue;
                }
            }
            List<OcrScanResultFieldModel> fields = fieldRepositoryPort.findByOcrScanResultId(result.getId());
            for (OcrScanResultFieldModel field : fields) {
                if (correctedOnly && !field.isCorrected()) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("ocrScanResultId", result.getId());
                row.put("aiModelId", result.getAiModelId());
                row.put("templateId", result.getTemplateId());
                row.put("stationId", result.getStationId());
                row.put("fieldName", field.getFieldName() != null ? field.getFieldName().name() : null);
                row.put("aiValue", field.getAiValue());
                row.put("aiConfidence", field.getAiConfidence());
                row.put("correctedValue", field.getCorrectedValue());
                row.put("isCorrected", field.isCorrected());
                row.put("validationStatus", field.getValidationStatus() != null ? field.getValidationStatus().name() : null);
                rows.add(row);
            }
        }
        return rows;
    }

    private AiModelRegistryResponse toModelResponse(AiModelRegistryModel model) {
        return AiModelRegistryResponse.builder()
                .id(model.getId())
                .provider(model.getProvider())
                .modelName(model.getModelName())
                .displayName(model.getDisplayName())
                .isActive(model.isActive())
                .isDefault(model.isDefault())
                .notes(model.getNotes())
                .build();
    }

    private AiModelMetricResponse toMetricResponse(AiModelMetricModel model) {
        Double rate = model.getTotalFields() > 0
                ? (double) model.getCorrectedFields() / (double) model.getTotalFields()
                : null;
        return AiModelMetricResponse.builder()
                .id(model.getId())
                .modelId(model.getModelId())
                .metricDate(model.getMetricDate())
                .fieldName(model.getFieldName())
                .totalFields(model.getTotalFields())
                .correctedFields(model.getCorrectedFields())
                .avgAiConfidence(model.getAvgAiConfidence())
                .correctionRate(rate)
                .build();
    }

    private TrainingDatasetExportResponse toExportResponse(TrainingDatasetExportModel model) {
        return TrainingDatasetExportResponse.builder()
                .id(model.getId())
                .filterJson(model.getFilterJson())
                .filePath(model.getFilePath())
                .rowCount(model.getRowCount())
                .status(model.getStatus())
                .usedForModelId(model.getUsedForModelId())
                .errorMessage(model.getErrorMessage())
                .exportedAt(model.getExportedAt())
                .createdAt(model.getCreatedAt())
                .build();
    }
}
