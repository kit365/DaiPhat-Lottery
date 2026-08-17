package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierDefaultImportCostRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierProfileRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotterySupplierRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotterySupplierResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotterySupplierServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-suppliers")
@RequiredArgsConstructor
public class LotterySupplierController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";

    private final LotterySupplierServicePort lotterySupplierServicePort;

    @PostMapping
    @PreAuthorize("hasAuthority('supplier:create')")
    public ApiResponse<LotterySupplierResponse> create(@Valid @RequestBody CreateLotterySupplierRequest request) {
        return ApiResponse.success("Tạo nhà cung cấp thành công.", lotterySupplierServicePort.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier:view')")
    public ApiResponse<LotterySupplierResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, lotterySupplierServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAuthority('supplier:view')")
    public ApiResponse<PageResponse<LotterySupplierResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction
    ) {
        return ApiResponse.success(
                null,
                lotterySupplierServicePort.getAll(page, size, search, isActive, sortBy, direction)
        );
    }

    /**
     * Fixes identifying details from the file-import preview, which is where a
     * stale phone number or address surfaces — hence importBatch:create is
     * accepted alongside supplier:edit. Timing rules are not reachable here.
     */
    @PutMapping("/profile")
    @PreAuthorize("hasAnyAuthority('supplier:edit', 'importBatch:create')")
    public ApiResponse<LotterySupplierResponse> updateProfile(
            @Valid @RequestBody UpdateLotterySupplierProfileRequest request) {
        return ApiResponse.success(
                "Đã cập nhật thông tin nhà cung cấp.",
                lotterySupplierServicePort.updateProfile(request));
    }

    /**
     * Fixes the NCC default import cost from settlement matching, which is where
     * an actual import price disagrees with the master — hence importBatch:create
     * is accepted alongside supplier:edit. Identity and timing rules stay as they
     * are.
     */
    @PutMapping("/{id}/default-import-cost")
    @PreAuthorize("hasAnyAuthority('supplier:edit', 'importBatch:create')")
    public ApiResponse<LotterySupplierResponse> updateDefaultImportCost(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotterySupplierDefaultImportCostRequest request
    ) {
        return ApiResponse.success(
                "Đã cập nhật giá nhập mặc định nhà cung cấp.",
                lotterySupplierServicePort.updateDefaultImportCost(id, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('supplier:edit')")
    public ApiResponse<LotterySupplierResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotterySupplierRequest request
    ) {
        return ApiResponse.success("Cập nhật nhà cung cấp thành công.", lotterySupplierServicePort.update(id, request));
    }
}
