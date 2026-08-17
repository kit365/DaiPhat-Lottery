package com.daiphat.coreapi.adapter.in.web.controller.streetagent;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.streetagent.CreateVendorAllocationDraftRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReturnVendorAllocationSerialsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ReplaceVendorAllocationReturnsRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorReturnInspectionRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.ConfirmVendorNoReturnRequest;
import com.daiphat.coreapi.application.dto.request.streetagent.SettleVendorAllocationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationBatchResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationCandidateResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorAllocationSuggestionResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorConfirmationQuoteResponse;
import com.daiphat.coreapi.application.dto.response.streetagent.VendorSettlementPreviewResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.daiphat.coreapi.application.port.in.streetagent.VendorAllocationServicePort;
import com.daiphat.coreapi.domain.model.enums.streetagent.AllocationBatchStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.math.BigDecimal;
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
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<List<VendorAllocationCandidateResponse>> getCandidates(
            @RequestParam Long profileId,
            @RequestParam LocalDate businessDate) {
        return ApiResponse.success(null, vendorAllocationServicePort.getCandidates(profileId, businessDate));
    }

    @GetMapping("/suggestions")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<VendorAllocationSuggestionResponse> getSuggestion(
            @RequestParam Long profileId,
            @RequestParam LocalDate businessDate,
            @RequestParam(required = false) Integer requestedQuantity,
            @RequestParam(required = false) BigDecimal faceValue) {
        return ApiResponse.success(null, vendorAllocationServicePort.getSuggestion(profileId, businessDate, requestedQuantity, faceValue));
    }

    @GetMapping("/open")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<VendorAllocationBatchResponse> getOpenBatch(@RequestParam Long profileId) {
        return ApiResponse.success(null, vendorAllocationServicePort.getOpenBatch(profileId));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<PageResponse<VendorAllocationBatchResponse>> list(
            @RequestParam(required = false) Long profileId,
            @RequestParam(required = false) Collection<AllocationBatchStatus> status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate businessDateTo,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size) {
        return ApiResponse.success(
                null,
                vendorAllocationServicePort.list(
                        profileId, status, businessDateFrom, businessDateTo, search, page, size));
    }

    @PostMapping("/drafts")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> createDraft(
            @Valid @RequestBody CreateVendorAllocationDraftRequest request,
            Authentication authentication) {
        boolean canOverrideLuckyTicket = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "streetAgent:manage".equals(authority.getAuthority()));
        return ApiResponse.success("Đã giữ vé cho phiếu bàn giao nháp.",
                vendorAllocationServicePort.createDraft(request, canOverrideLuckyTicket));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<VendorAllocationBatchResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, vendorAllocationServicePort.getById(id));
    }

    @GetMapping("/{id}/confirmation-quote")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ResponseEntity<ApiResponse<VendorConfirmationQuoteResponse>> getConfirmationQuote(@PathVariable Long id) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(ApiResponse.success(null, vendorAllocationServicePort.getConfirmationQuote(id)));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('streetAgent:manage')")
    public ApiResponse<VendorAllocationBatchResponse> confirm(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmVendorAllocationRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã xác nhận bàn giao vé và nhận tiền cọc.", vendorAllocationServicePort.confirm(id, request, principal.getId()));
    }

    @PostMapping("/{id}/return-session")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> openReturnSession(@PathVariable Long id) {
        return ApiResponse.success("Đã mở phiên nhận vé trả.", vendorAllocationServicePort.openReturnSession(id));
    }

    @PostMapping("/{id}/returns")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> recordReturns(
            @PathVariable Long id,
            @Valid @RequestBody ReturnVendorAllocationSerialsRequest request) {
        return ApiResponse.success("Đã ghi nhận vé trả.", vendorAllocationServicePort.recordReturns(id, request));
    }

    @PutMapping("/{id}/returns")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> replaceReturns(
            @PathVariable Long id,
            @Valid @RequestBody ReplaceVendorAllocationReturnsRequest request) {
        return ApiResponse.success("Đã cập nhật danh sách vé chờ kiểm nhận.",
                vendorAllocationServicePort.replaceReturns(id, request));
    }

    @DeleteMapping("/{id}/returns/{serialId}")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> removeReturn(
            @PathVariable Long id,
            @PathVariable Long serialId) {
        return ApiResponse.success("Đã bỏ vé khỏi danh sách chờ kiểm nhận.",
                vendorAllocationServicePort.removeReturn(id, serialId));
    }

    @PostMapping("/{id}/return-inspection/confirm")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> confirmReturnInspection(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ConfirmVendorReturnInspectionRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã xác nhận kiểm nhận vé trả.",
                vendorAllocationServicePort.confirmReturnInspection(
                        id, request != null ? request : new ConfirmVendorReturnInspectionRequest(null, null), principal.getId()));
    }

    @PostMapping("/{id}/return-inspection/confirm-no-return")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> confirmNoReturnedTickets(
            @PathVariable Long id,
            @RequestBody(required = false) ConfirmVendorNoReturnRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã xác nhận người bán vé số không trả vé.",
                vendorAllocationServicePort.confirmNoReturnedTickets(
                        id, request == null ? new ConfirmVendorNoReturnRequest(null) : request, principal.getId()));
    }

    @PostMapping("/{id}/return-inspection/reopen")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<VendorAllocationBatchResponse> reopenReturnInspection(@PathVariable Long id) {
        return ApiResponse.success("Đã mở lại bước kiểm nhận vé trả.",
                vendorAllocationServicePort.reopenReturnInspection(id));
    }

    @GetMapping("/{id}/settlement-preview")
    @PreAuthorize("hasAuthority('streetAgent:view')")
    public ApiResponse<VendorSettlementPreviewResponse> previewSettlement(@PathVariable Long id) {
        return ApiResponse.success(null, vendorAllocationServicePort.previewSettlement(id));
    }

    @PostMapping("/{id}/settle")
    @PreAuthorize("hasAuthority('streetAgent:manage')")
    public ApiResponse<VendorAllocationBatchResponse> settle(
            @PathVariable Long id,
            @Valid @RequestBody SettleVendorAllocationRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success("Đã quyết toán phiếu bàn giao.", vendorAllocationServicePort.settle(id, request, principal.getId()));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('streetAgent:edit')")
    public ApiResponse<Void> cancel(@PathVariable Long id) {
        vendorAllocationServicePort.cancel(id);
        return ApiResponse.success("Đã hủy phiếu bàn giao nháp và nhả vé.", null);
    }
}
