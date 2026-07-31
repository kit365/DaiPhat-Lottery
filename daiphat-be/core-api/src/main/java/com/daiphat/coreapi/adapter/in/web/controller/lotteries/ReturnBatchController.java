package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.AttachReturnSerialsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchLineStatusRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateReturnBatchRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ReturnBatchResponse;
import com.daiphat.coreapi.application.port.in.lotteries.ReturnBatchServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.ReturnBatchStatus;
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

@RestController
@RequestMapping(ApiConstants.API_V1 + "/return-batches")
@RequiredArgsConstructor
@Validated
public class ReturnBatchController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final ReturnBatchServicePort returnBatchServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> create(
            @Valid @RequestBody CreateReturnBatchRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Tạo phiếu trả vé thành công.",
                returnBatchServicePort.create(request, principal.getId())
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReturnBatchRequest request
    ) {
        return ApiResponse.success(
                "Cập nhật phiếu trả vé thành công.",
                returnBatchServicePort.update(id, request)
        );
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
                        status,
                        drawDateFrom,
                        drawDateTo,
                        search,
                        sortBy,
                        direction
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

    @PostMapping("/{id}/mark-returned")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> markReturned(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã đánh dấu phiếu trả vé đã giao.",
                returnBatchServicePort.markReturned(id, principal.getId())
        );
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<ReturnBatchResponse> confirm(
            @PathVariable Long id,
            @RequestBody(required = false) ConfirmReturnBatchRequest request
    ) {
        return ApiResponse.success(
                "Xác nhận phiếu trả vé thành công.",
                returnBatchServicePort.confirm(id, request != null ? request : new ConfirmReturnBatchRequest(null))
        );
    }
}
