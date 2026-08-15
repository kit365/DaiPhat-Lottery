package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFileImportCommitRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ImportBatchFilePreviewRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveImportBatchFileMappingProfileRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SaveLotteryStationAliasRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateImportBatchFileConfigRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileConfigResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileExportResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileJobResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileMappingProfileResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileImportResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFileInspectResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ImportBatchFilePreviewResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ImportBatchFileImportServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

/**
 * Creating import batches from a supplier .csv / .xlsx file.
 *
 * <p>Inspect and preview write nothing, so the client may call them as often as
 * the user adjusts the column mapping. Only the commit endpoint creates data, and
 * it does so through the ordinary import batch creation path.
 */
@RestController
@RequestMapping(ApiConstants.API_V1 + "/import-batches/file-import")
@RequiredArgsConstructor
@Validated
@Slf4j
public class ImportBatchFileImportController {

    private final ImportBatchFileImportServicePort importBatchFileImportServicePort;

    @PostMapping(value = "/inspect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ImportBatchFileInspectResponse> inspect(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Long supplierId) {
        return ApiResponse.success(
                null,
                importBatchFileImportServicePort.inspect(readBytes(file), file.getOriginalFilename(), supplierId)
        );
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ImportBatchFilePreviewResponse> preview(
            @RequestPart("file") MultipartFile file,
            @RequestPart("request") @Valid ImportBatchFilePreviewRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                null,
                importBatchFileImportServicePort.preview(
                        readBytes(file),
                        file.getOriginalFilename(),
                        request,
                        requireOperatorId(principal)
                )
        );
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ImportBatchFileImportResultResponse> commit(
            @RequestPart("file") MultipartFile file,
            @RequestPart("request") @Valid ImportBatchFileImportCommitRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        ImportBatchFileImportResultResponse result = importBatchFileImportServicePort.commit(
                readBytes(file),
                file.getOriginalFilename(),
                request,
                requireOperatorId(principal)
        );

        String message = result.failedCount() == 0
                ? String.format("Đã tạo %d phiếu nhập lô vé từ tệp.", result.createdCount())
                : String.format("Đã tạo %d/%d phiếu nhập lô vé. %d ngày quay không tạo được.",
                        result.createdCount(), result.requestedCount(), result.failedCount());

        return ApiResponse.success(message, result);
    }

    /**
     * Downloads a batch in the same schema the importer accepts, so the file can be
     * edited in Excel and uploaded straight back.
     */
    @GetMapping("/export/{importBatchId:\\d+}")
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'importBatch:create')")
    public ResponseEntity<byte[]> export(@PathVariable Long importBatchId) {
        ImportBatchFileExportResponse export = importBatchFileImportServicePort.export(importBatchId);
        byte[] body = export.content().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(export.fileName()).build().toString())
                .body(body);
    }

    /** Shows the operator what rules the importer will apply before they upload. */
    @GetMapping("/config")
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'importBatch:create', 'supplier:view', 'supplier:edit')")
    public ApiResponse<ImportBatchFileConfigResponse> getConfig() {
        return ApiResponse.success(null, importBatchFileImportServicePort.getConfig());
    }

    /** Updates shared auto-detect aliases / limits (N suppliers → 1 config). */
    @PutMapping("/config")
    @PreAuthorize("hasAnyAuthority('importBatch:create', 'settings:edit', 'supplier:edit')")
    public ApiResponse<ImportBatchFileConfigResponse> updateConfig(
            @Valid @RequestBody UpdateImportBatchFileConfigRequest request) {
        return ApiResponse.success(
                "Đã cập nhật cấu hình đọc tệp.",
                importBatchFileImportServicePort.updateConfig(request));
    }

    /** History of file-import runs, newest first. */
    @GetMapping("/jobs")
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'importBatch:create')")
    public ApiResponse<PageResponse<ImportBatchFileJobResponse>> getJobs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long supplierId) {
        return ApiResponse.success(
                null, importBatchFileImportServicePort.getJobs(page, size, supplierId));
    }

    /** Column mappings remembered per supplier and file layout. */
    @GetMapping("/mapping-profiles")
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'importBatch:create')")
    public ApiResponse<List<ImportBatchFileMappingProfileResponse>> getMappingProfiles(
            @RequestParam(required = false) Long supplierId) {
        return ApiResponse.success(
                null, importBatchFileImportServicePort.getMappingProfiles(supplierId));
    }

    @DeleteMapping("/mapping-profiles/{id:\\d+}")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<Void> deleteMappingProfile(@PathVariable Long id) {
        importBatchFileImportServicePort.deleteMappingProfile(id);
        return ApiResponse.success("Đã xóa cấu hình cột đã lưu.", null);
    }

    @PostMapping("/mapping-profiles")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<Void> saveMappingProfile(
            @Valid @RequestBody SaveImportBatchFileMappingProfileRequest request) {
        importBatchFileImportServicePort.saveMappingProfile(request);
        return ApiResponse.success("Đã lưu cấu hình cột cho nhà cung cấp này.", null);
    }

    @PostMapping("/station-aliases")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<Void> saveStationAlias(@Valid @RequestBody SaveLotteryStationAliasRequest request) {
        importBatchFileImportServicePort.saveStationAlias(request);
        return ApiResponse.success("Đã ghi nhớ cách viết tên nhà đài này.", null);
    }

    private UUID requireOperatorId(AuthenticatedUserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new DomainException(ErrorCode.UNAUTHORIZED);
        }
        return principal.getId();
    }

    private byte[] readBytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_REQUIRED);
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            log.warn("Could not read uploaded import batch file", e);
            throw new DomainException(ErrorCode.IMPORT_BATCH_FILE_UNREADABLE, e);
        }
    }
}
