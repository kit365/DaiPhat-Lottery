package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.scan.CreateTrainingDatasetExportRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.AiModelMetricResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.AiModelRegistryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.scan.TrainingDatasetExportResponse;
import com.daiphat.coreapi.application.service.lotteries.AiModelPlatformService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/ai-models")
@RequiredArgsConstructor
public class AiModelPlatformController {

    private final AiModelPlatformService aiModelPlatformService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view', 'station:view')")
    public ApiResponse<List<AiModelRegistryResponse>> listModels() {
        return ApiResponse.success(null, aiModelPlatformService.listModels());
    }

    @GetMapping("/{modelId}/metrics")
    @PreAuthorize("hasAnyAuthority('ticket:view', 'station:view')")
    public ApiResponse<List<AiModelMetricResponse>> listMetrics(
            @PathVariable Long modelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.success(null, aiModelPlatformService.listMetrics(modelId, from, to));
    }

    @PostMapping("/metrics/aggregate")
    @PreAuthorize("hasAnyAuthority('ticket:create', 'station:update')")
    public ApiResponse<Map<String, Object>> aggregateMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate metricDate
    ) {
        int upserted = aiModelPlatformService.aggregateMetricsForDate(metricDate);
        return ApiResponse.success(
                "Đã tổng hợp metric AI model.",
                Map.of("upserted", upserted)
        );
    }

    @PostMapping("/exports")
    @PreAuthorize("hasAnyAuthority('ticket:create', 'station:update')")
    public ApiResponse<TrainingDatasetExportResponse> createExport(
            @Valid @RequestBody CreateTrainingDatasetExportRequest request
    ) {
        return ApiResponse.success(
                "Tạo export dataset OCR thành công.",
                aiModelPlatformService.createExport(request)
        );
    }

    @GetMapping("/exports")
    @PreAuthorize("hasAnyAuthority('ticket:view', 'station:view')")
    public ApiResponse<List<TrainingDatasetExportResponse>> listExports() {
        return ApiResponse.success(null, aiModelPlatformService.listExports());
    }

    @GetMapping("/exports/{id}")
    @PreAuthorize("hasAnyAuthority('ticket:view', 'station:view')")
    public ApiResponse<TrainingDatasetExportResponse> getExport(@PathVariable Long id) {
        return ApiResponse.success(null, aiModelPlatformService.getExport(id));
    }
}
