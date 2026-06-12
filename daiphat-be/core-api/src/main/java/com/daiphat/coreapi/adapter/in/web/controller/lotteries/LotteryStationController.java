package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryProductRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryProductResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryProductServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-stations")
@RequiredArgsConstructor
@Slf4j
public class LotteryStationController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final LotteryProductServicePort lotteryProductServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<LotteryProductResponse> create(
            @Valid @RequestBody CreateLotteryProductRequest request) {
        LotteryProductResponse response = lotteryProductServicePort.create(request);
        return ApiResponse.success("Tạo sản phẩm vé số thành công.", response);
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<LotteryProductResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, lotteryProductServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<PageResponse<LotteryProductResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {

        return ApiResponse.success(null,
                lotteryProductServicePort.getAll(page, size, search, status, type, sortBy, direction));
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryProductResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotteryProductRequest request) {
        LotteryProductResponse response = lotteryProductServicePort.update(id, request);
        return ApiResponse.success("Cập nhật sản phẩm vé số thành công.", response);
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        lotteryProductServicePort.delete(id);
        return ApiResponse.success("Xóa sản phẩm vé số thành công.");
    }
}
