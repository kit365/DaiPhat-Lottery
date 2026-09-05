package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchClassificationPreviewRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchInvoiceEvidenceRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchTicketListImagesRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchClassificationPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchEligibleStationsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchLineEntryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchReductionTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchTimePolicyResponse;
import com.daiphat.coreapi.application.dto.response.order.EnumOptionResponse;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchImportMode;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ImportBatchType;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/import-batches")
@RequiredArgsConstructor
@Validated
public class ImportBatchController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final ImportBatchServicePort importBatchServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> create(
            @Valid @RequestBody CreateImportBatchRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Tạo phiếu nhập lô vé thành công.",
                importBatchServicePort.create(request, principal.getId())
        );
    }

    @PutMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateImportBatchRequest request) {
        return ApiResponse.success(
                "Cập nhật phiếu nhập lô vé thành công.",
                importBatchServicePort.update(id, request)
        );
    }

    @PostMapping("/{id:\\d+}/invoice-evidence")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> attachInvoiceEvidence(
            @PathVariable Long id,
            @Valid @RequestBody UpdateImportBatchInvoiceEvidenceRequest request) {
        return ApiResponse.success(
                "Đã đính kèm ảnh biên lai phiếu nhập.",
                importBatchServicePort.attachInvoiceEvidence(id, request.invoiceEvidenceUrl())
        );
    }

    @PostMapping(value = "/invoice-evidence/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<StorageResult> uploadInvoiceEvidence(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(
                "Tải tệp biên lai phiếu nhập thành công.",
                importBatchServicePort.uploadInvoiceEvidence(StorageUtils.toUploadRequest(file))
        );
    }

    @PostMapping(value = "/ticket-list-images/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<StorageResult> uploadTicketListImage(@RequestPart("file") MultipartFile file) {
        return ApiResponse.success(
                "Tải tệp danh sách vé nhập thành công.",
                importBatchServicePort.uploadTicketListImage(StorageUtils.toUploadRequest(file))
        );
    }

    @PostMapping("/{id:\\d+}/ticket-list-images")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> attachTicketListImages(
            @PathVariable Long id,
            @RequestBody UpdateImportBatchTicketListImagesRequest request) {
        return ApiResponse.success(
                "Đã cập nhật ảnh danh sách vé nhập.",
                importBatchServicePort.attachTicketListImages(id, request == null ? null : request.urls())
        );
    }

    @GetMapping("/active-draft")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ImportBatchResponse>> getActiveDraft(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }

        Optional<ImportBatchResponse> draft = importBatchServicePort.getActiveDraft(principal.getId());
        if (draft.isPresent()) {
            return ResponseEntity.ok(ApiResponse.success(null, draft.get()));
        }

        return ResponseEntity.ok(ApiResponse.success("No active draft import batch found.", null));
    }

    @GetMapping("/incomplete")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view', 'ticket:create')")
    public ApiResponse<List<ImportBatchResponse>> getIncompleteBatches() {
        return ApiResponse.success(null, importBatchServicePort.getIncompleteBatches());
    }

    @PostMapping("/{batchId:\\d+}/cancel")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> cancelDraft(
            @PathVariable Long batchId,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        if (principal == null) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }
        return ApiResponse.success(
                "Đã hủy phiếu nhập nháp.",
                importBatchServicePort.cancelDraft(batchId, principal.getId())
        );
    }

    @GetMapping("/without-lines")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view', 'ticket:create')")
    public ApiResponse<List<ImportBatchResponse>> getBatchesWithoutLines() {
        return ApiResponse.success(null, importBatchServicePort.getBatchesWithoutLines());
    }

    @PostMapping("/{batchId:\\d+}/lines/{lineId:\\d+}/pause")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> pauseLine(
            @PathVariable Long batchId,
            @PathVariable Long lineId) {
        return ApiResponse.success(
                "Đã tạm dừng nhập dòng phiếu.",
                importBatchServicePort.pauseLine(batchId, lineId)
        );
    }

    @PostMapping("/{batchId:\\d+}/lines/{lineId:\\d+}/resume")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> resumeLine(
            @PathVariable Long batchId,
            @PathVariable Long lineId) {
        return ApiResponse.success(
                "Đã tiếp tục nhập dòng phiếu.",
                importBatchServicePort.resumeLine(batchId, lineId)
        );
    }

    @DeleteMapping("/{batchId:\\d+}/lines/{lineId:\\d+}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchResponse> deleteLine(
            @PathVariable Long batchId,
            @PathVariable Long lineId) {
        return ApiResponse.success(
                "Xóa dòng phiếu nhập lô thành công.",
                importBatchServicePort.deleteLine(batchId, lineId)
        );
    }

    @GetMapping("/{id:\\d+}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view', 'importBatch:create', 'ticket:create')")
    public ApiResponse<ImportBatchResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, importBatchServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view')")
    public ApiResponse<PageResponse<ImportBatchResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long lotteryStationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDateTo,
            @RequestParam(required = false) ImportBatchStatus status,
            @RequestParam(required = false) ImportBatchType batchType,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        return ApiResponse.success(
                null,
                importBatchServicePort.getAll(page, size, lotteryStationId, drawDateFrom, drawDateTo, status, batchType, sortBy, direction)
        );
    }

    @GetMapping("/{id:\\d+}/reduction-tickets")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchReductionTicketsResponse> getReductionTickets(@PathVariable Long id) {
        return ApiResponse.success(null, importBatchServicePort.getReductionTickets(id));
    }

    @GetMapping("/{batchId:\\d+}/lines/{lineId:\\d+}/entry-tickets")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view', 'importBatch:create', 'ticket:create')")
    public ApiResponse<ImportBatchLineEntryTicketsResponse> getLineEntryTickets(
            @PathVariable Long batchId,
            @PathVariable Long lineId) {
        return ApiResponse.success(null, importBatchServicePort.getLineEntryTickets(batchId, lineId));
    }

    @GetMapping("/batch-types")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view')")
    public ApiResponse<List<EnumOptionResponse>> getBatchTypes() {
        return ApiResponse.success(null, importBatchServicePort.getBatchTypeOptions());
    }

    @GetMapping("/time-policy")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:view', 'importBatch:create')")
    public ApiResponse<ImportBatchTimePolicyResponse> getTimePolicy() {
        return ApiResponse.success(null, importBatchServicePort.getTimePolicy());
    }

    @GetMapping("/eligible-stations")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchEligibleStationsResponse> getEligibleStations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @RequestParam ImportBatchImportMode importMode,
            @RequestParam(required = false) Long excludeBatchId) {
        return ApiResponse.success(
                null,
                importBatchServicePort.getEligibleStations(drawDate, importMode, excludeBatchId)
        );
    }

    @GetMapping("/classify-preview")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'importBatch:create')")
    public ApiResponse<ImportBatchClassificationPreviewResponse> previewClassification(
            @RequestParam Long lotteryStationId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @RequestParam ImportBatchImportMode importMode,
            @RequestParam(required = false) Long excludeBatchId) {
        ImportBatchClassificationPreviewRequest request = ImportBatchClassificationPreviewRequest.builder()
                .lotteryStationId(lotteryStationId)
                .drawDate(drawDate)
                .importMode(importMode)
                .excludeBatchId(excludeBatchId)
                .build();
        return ApiResponse.success(null, importBatchServicePort.previewClassification(request));
    }
}
