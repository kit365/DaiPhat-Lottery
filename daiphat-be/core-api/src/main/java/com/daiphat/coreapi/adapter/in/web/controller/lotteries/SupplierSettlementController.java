package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.AddSettlementMonetaryAdjustmentRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CompleteSettlementReconciliationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmSettlementMatchingRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveImportDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveReturnDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResolveUnitPriceDiscrepancyRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateSupplierSettlementReceiptRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementCompleteResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SettlementResolvableSerialResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementAdjustmentResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/supplier-settlements")
@RequiredArgsConstructor
@Validated
public class SupplierSettlementController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final SupplierSettlementServicePort supplierSettlementServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('supplier:view', 'importBatch:view')")
    public ApiResponse<PageResponse<SupplierSettlementResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long lotterySupplierId,
            @RequestParam(required = false) SupplierSettlementStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate periodTo,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction
    ) {
        return ApiResponse.success(
                null,
                supplierSettlementServicePort.getAll(
                        page,
                        size,
                        lotterySupplierId,
                        status,
                        periodFrom,
                        periodTo,
                        search,
                        sortBy,
                        direction
                )
        );
    }

    @GetMapping("/{id}/overview")
    @PreAuthorize("hasAnyAuthority('supplier:view', 'importBatch:view')")
    public ApiResponse<SupplierSettlementOverviewResponse> getOverview(@PathVariable Long id) {
        return ApiResponse.success(null, supplierSettlementServicePort.getOverview(id));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('supplier:view', 'importBatch:view')")
    public ApiResponse<SupplierSettlementResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, supplierSettlementServicePort.getById(id));
    }

    @PostMapping("/{id}/receipt")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementResponse> updateReceiptUrl(
            @PathVariable Long id,
            @RequestBody UpdateSupplierSettlementReceiptRequest request
    ) {
        return ApiResponse.success(
                "Đã cập nhật biên lai đối soát nhà cung cấp thành công.",
                supplierSettlementServicePort.updateReceiptUrl(
                        id,
                        request != null ? request.supplierSettlementReceiptUrl() : null
                )
        );
    }

    @PostMapping("/{id}/reconciliation/matching")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementResponse> confirmMatching(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmSettlementMatchingRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã xác nhận đối chiếu số liệu.",
                supplierSettlementServicePort.confirmMatching(id, request, principal.getId())
        );
    }

    @GetMapping("/{id}/reconciliation/missing-return-tickets")
    @PreAuthorize("hasAnyAuthority('supplier:view', 'importBatch:view')")
    public ApiResponse<List<SettlementResolvableSerialResponse>> listMissingReturnTickets(@PathVariable Long id) {
        return ApiResponse.success(null, supplierSettlementServicePort.listMissingReturnTickets(id));
    }

    @GetMapping("/{id}/reconciliation/import-resolvable-tickets")
    @PreAuthorize("hasAnyAuthority('supplier:view', 'importBatch:view')")
    public ApiResponse<List<SettlementResolvableSerialResponse>> listImportResolvableTickets(@PathVariable Long id) {
        return ApiResponse.success(null, supplierSettlementServicePort.listImportResolvableTickets(id));
    }

    @PostMapping("/{id}/reconciliation/resolve-import")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementResponse> resolveImport(
            @PathVariable Long id,
            @Valid @RequestBody ResolveImportDiscrepancyRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã cập nhật xử lý chênh lệch nhập.",
                supplierSettlementServicePort.resolveImportDiscrepancy(id, request, principal.getId())
        );
    }

    @PostMapping("/{id}/reconciliation/resolve-return")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementResponse> resolveReturn(
            @PathVariable Long id,
            @Valid @RequestBody ResolveReturnDiscrepancyRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã cập nhật xử lý vé trả thiếu.",
                supplierSettlementServicePort.resolveReturnDiscrepancy(id, request, principal.getId())
        );
    }

    @PostMapping("/{id}/reconciliation/resolve-unit-price")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementResponse> resolveUnitPrice(
            @PathVariable Long id,
            @Valid @RequestBody ResolveUnitPriceDiscrepancyRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã ghi nhận chênh lệch giá nhập.",
                supplierSettlementServicePort.resolveUnitPriceDiscrepancy(id, request, principal.getId())
        );
    }

    @PostMapping("/{id}/reconciliation/settlement-adjustments")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementAdjustmentResponse> addSettlementAdjustment(
            @PathVariable Long id,
            @Valid @RequestBody AddSettlementMonetaryAdjustmentRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã thêm điều chỉnh thanh toán.",
                supplierSettlementServicePort.addSettlementMonetaryAdjustment(id, request, principal.getId())
        );
    }

    @PostMapping("/{id}/reconciliation/recalculate")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SupplierSettlementResponse> recalculate(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã tính lại số tiền đối soát.",
                supplierSettlementServicePort.recalculateReconciliation(id, principal.getId())
        );
    }

    @PostMapping("/{id}/reconciliation/complete")
    @PreAuthorize("hasAnyAuthority('importBatch:create')")
    public ApiResponse<SettlementCompleteResultResponse> complete(
            @PathVariable Long id,
            @RequestBody(required = false) CompleteSettlementReconciliationRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        SettlementCompleteResultResponse result = supplierSettlementServicePort.completeReconciliation(
                id,
                request != null ? request : new CompleteSettlementReconciliationRequest(null),
                principal.getId()
        );
        return ApiResponse.success(result.message(), result);
    }
}
