package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/import-batches")
@RequiredArgsConstructor
@Validated
public class ImportBatchController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final ImportBatchServicePort importBatchServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ImportBatchResponse> create(
            @Valid @RequestBody CreateImportBatchRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Tạo phiếu nhập lô vé thành công.",
                importBatchServicePort.create(request, principal.getId())
        );
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('importBatch:view')")
    public ApiResponse<ImportBatchResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, importBatchServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('importBatch:view')")
    public ApiResponse<PageResponse<ImportBatchResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long lotteryStationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @RequestParam(required = false) ImportBatchStatus status,
            @RequestParam(required = false) ImportBatchType batchType,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        return ApiResponse.success(
                null,
                importBatchServicePort.getAll(page, size, lotteryStationId, drawDate, status, batchType, sortBy, direction)
        );
    }

    @GetMapping("/batch-types")
    @PreAuthorize("hasAnyAuthority('importBatch:view')")
    public ApiResponse<List<EnumOptionResponse>> getBatchTypes() {
        return ApiResponse.success(null, importBatchServicePort.getBatchTypeOptions());
    }

    @GetMapping("/classify-preview")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ImportBatchClassificationPreviewResponse> previewClassification(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @RequestParam ImportBatchType requestedBatchType) {
        ImportBatchClassificationPreviewRequest request = ImportBatchClassificationPreviewRequest.builder()
                .drawDate(drawDate)
                .requestedBatchType(requestedBatchType)
                .build();
        return ApiResponse.success(null, importBatchServicePort.previewClassification(request));
    }
}
