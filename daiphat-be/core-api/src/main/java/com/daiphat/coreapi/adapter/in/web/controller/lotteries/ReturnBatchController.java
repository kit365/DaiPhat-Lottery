package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnHandoverRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchLineStatusRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnEvidenceRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.InspectableReturnSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ReturnBatchServicePort;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
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
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/return-batches")
@RequiredArgsConstructor
@Validated
public class ReturnBatchController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final ReturnBatchServicePort returnBatchServicePort;

    /**
     * Manual header/line edits are disabled — return batches are system-generated and read-only.
     * Workflow endpoints (inspect / handover / serial attach) remain available below.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> update(@PathVariable("id") Long ignoredId) {
        throw new DomainException(ErrorCode.RETURN_BATCH_READ_ONLY);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'supplier:view')")
    public ApiResponse<ReturnBatchResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, returnBatchServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'supplier:view')")
    public ApiResponse<PageResponse<ReturnBatchResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long lotterySupplierId,
            @RequestParam(required = false) Long supplierSettlementId,
            @RequestParam(defaultValue = "SUPPLIER_RETURN") ReturnBatchType returnBatchType,
            @RequestParam(required = false) ReturnBatchStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDateTo,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction
    ) {
        return ApiResponse.success(
                null,
                returnBatchServicePort.getAll(
                        page,
                        size,
                        lotterySupplierId,
                        supplierSettlementId,
                        returnBatchType,
                        status,
                        drawDateFrom,
                        drawDateTo,
                        search,
                        sortBy,
                        direction
                )
        );
    }

    @GetMapping("/{id}/inspectable-serials")
    @PreAuthorize("hasAnyAuthority('importBatch:view', 'importBatch:create')")
    public ApiResponse<List<InspectableReturnSerialResponse>> listInspectableSerials(@PathVariable Long id) {
        return ApiResponse.success(null, returnBatchServicePort.listInspectableSerials(id));
    }

    @PostMapping("/{id}/start-inspection")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> startInspection(@PathVariable Long id) {
        return ApiResponse.success(
                "Đã bắt đầu kiểm tra vé trả.",
                returnBatchServicePort.startInspection(id)
        );
    }

    @PostMapping("/{id}/confirm-inspection")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> confirmInspection(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmReturnInspectionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã xác nhận kiểm tra vé trả.",
                returnBatchServicePort.confirmInspection(id, request, principal.getId())
        );
    }

    @PostMapping("/{id}/confirm-handover")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> confirmHandover(
            @PathVariable Long id,
            @RequestBody(required = false) ConfirmReturnHandoverRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã xác nhận bàn giao vé trả nhà cung cấp.",
                returnBatchServicePort.confirmHandover(
                        id,
                        request != null ? request : new ConfirmReturnHandoverRequest(null, null),
                        principal.getId()
                )
        );
    }

    @PostMapping("/{batchId}/lines/{lineId}/serials")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> attachSerials(
            @PathVariable Long batchId,
            @PathVariable Long lineId,
            @Valid @RequestBody AttachReturnSerialsRequest request
    ) {
        return ApiResponse.success(
                "Đã gắn sê-ri vào dòng trả vé.",
                returnBatchServicePort.attachSerials(batchId, lineId, request)
        );
    }

    @DeleteMapping("/{batchId}/lines/{lineId}/serials/{serialId}")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> detachSerial(
            @PathVariable Long batchId,
            @PathVariable Long lineId,
            @PathVariable Long serialId
    ) {
        return ApiResponse.success(
                "Đã gỡ sê-ri khỏi dòng trả vé.",
                returnBatchServicePort.detachSerial(batchId, lineId, serialId)
        );
    }

    @PostMapping("/{batchId}/lines/{lineId}/status")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> updateLineStatus(
            @PathVariable Long batchId,
            @PathVariable Long lineId,
            @Valid @RequestBody UpdateReturnBatchLineStatusRequest request
    ) {
        return ApiResponse.success(
                "Cập nhật trạng thái dòng trả vé thành công.",
                returnBatchServicePort.updateLineStatus(batchId, lineId, request)
        );
    }

    @PostMapping("/{id}/evidence")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> updateEvidenceUrl(
            @PathVariable Long id,
            @RequestBody UpdateReturnEvidenceRequest request
    ) {
        return ApiResponse.success(
                "Đã cập nhật ảnh biên lai trả vé thành công.",
                returnBatchServicePort.updateEvidenceUrl(
                        id,
                        request != null ? request.returnReceiptEvidenceUrl() : null
                )
        );
    }
}
