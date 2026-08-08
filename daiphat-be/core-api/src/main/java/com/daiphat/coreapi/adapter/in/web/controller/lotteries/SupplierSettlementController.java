package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateSupplierSettlementReceiptRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementOverviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.SupplierSettlementResponse;
import com.daiphat.coreapi.application.port.in.lotteries.SupplierSettlementServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.SupplierSettlementStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

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
}
