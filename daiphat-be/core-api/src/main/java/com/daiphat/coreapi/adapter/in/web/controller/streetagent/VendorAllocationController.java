package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationBatchResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationCandidateResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationSuggestionResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorSettlementPreviewResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/vendor-allocations")
@RequiredArgsConstructor
public class VendorAllocationController {
    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final VendorAllocationServicePort vendorAllocationServicePort;

    @GetMapping("/candidates")
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<List<VendorAllocationCandidateResponse>> getCandidates(
            @RequestParam Long profileId,
            @RequestParam LocalDate businessDate) {
        return ApiResponse.success(null, vendorAllocationServicePort.getCandidates(profileId, businessDate));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<VendorAllocationSuggestionResponse> getSuggestion(
            @RequestParam Long profileId,
            @RequestParam LocalDate businessDate) {
        return ApiResponse.success(null, vendorAllocationServicePort.getSuggestion(profileId, businessDate));
    }

    @GetMapping("/open")
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<VendorAllocationBatchResponse> getOpenBatch(@RequestParam Long profileId) {
        return ApiResponse.success(null, vendorAllocationServicePort.getOpenBatch(profileId));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<PageResponse<VendorAllocationBatchResponse>> list(
            @RequestParam(required = false) Long profileId,
            @RequestParam(required = false) Collection<AllocationBatchStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDateTo,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size) {
        return ApiResponse.success(
                null,
                vendorAllocationServicePort.list(profileId, status, businessDateFrom, businessDateTo, page, size));
    }

    @PostMapping("/drafts")
    @PreAuthorize("hasAnyAuthority('streetAgent:create', 'member:create')")
    public ApiResponse<VendorAllocationBatchResponse> createDraft(
            @Valid @RequestBody CreateVendorAllocationDraftRequest request) {
        return ApiResponse.success("Đã giữ vé cho phiếu bàn giao nháp.", vendorAllocationServicePort.createDraft(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<VendorAllocationBatchResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, vendorAllocationServicePort.getById(id));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyAuthority('streetAgent:edit', 'member:edit')")
    public ApiResponse<VendorAllocationBatchResponse> confirm(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmVendorAllocationRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã xác nhận bàn giao vé và nhận tiền cọc.", vendorAllocationServicePort.confirm(id, request, principal.getId()));
    }

    @PostMapping("/{id}/return-session")
    @PreAuthorize("hasAnyAuthority('streetAgent:edit', 'member:edit')")
    public ApiResponse<VendorAllocationBatchResponse> openReturnSession(@PathVariable Long id) {
        return ApiResponse.success("Đã mở phiên nhận vé trả.", vendorAllocationServicePort.openReturnSession(id));
    }

    @PostMapping("/{id}/returns")
    @PreAuthorize("hasAnyAuthority('streetAgent:edit', 'member:edit')")
    public ApiResponse<VendorAllocationBatchResponse> recordReturns(
            @PathVariable Long id,
            @Valid @RequestBody ReturnVendorAllocationSerialsRequest request) {
        return ApiResponse.success("Đã ghi nhận vé trả.", vendorAllocationServicePort.recordReturns(id, request));
    }

    @GetMapping("/{id}/settlement-preview")
    @PreAuthorize("hasAnyAuthority('streetAgent:view', 'member:view')")
    public ApiResponse<VendorSettlementPreviewResponse> previewSettlement(@PathVariable Long id) {
        return ApiResponse.success(null, vendorAllocationServicePort.previewSettlement(id));
    }

    @PostMapping("/{id}/settle")
    @PreAuthorize("hasAnyAuthority('streetAgent:edit', 'member:edit')")
    public ApiResponse<VendorAllocationBatchResponse> settle(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã quyết toán phiếu bàn giao.", vendorAllocationServicePort.settle(id, principal.getId()));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyAuthority('streetAgent:edit', 'member:edit')")
    public ApiResponse<Void> cancel(@PathVariable Long id) {
        vendorAllocationServicePort.cancel(id);
        return ApiResponse.success("Đã hủy phiếu bàn giao nháp và nhả vé.", null);
    }
}
