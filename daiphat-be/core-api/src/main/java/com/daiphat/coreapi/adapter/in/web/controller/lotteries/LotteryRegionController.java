package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryRegionRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryRegionResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryRegionServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-regions")
@RequiredArgsConstructor
public class LotteryRegionController {

    private final LotteryRegionServicePort lotteryRegionServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<LotteryRegionResponse>> getAll() {
        return ApiResponse.success(null, lotteryRegionServicePort.getAll());
    }

    @GetMapping("/{code}")
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<LotteryRegionResponse> getByCode(@PathVariable String code) {
        return ApiResponse.success(null, lotteryRegionServicePort.getByCode(code));
    }

    @PutMapping("/{code}")
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryRegionResponse> update(
            @PathVariable String code,
            @Valid @RequestBody UpdateLotteryRegionRequest request) {
        return ApiResponse.success("Cập nhật miền thành công.", lotteryRegionServicePort.update(code, request));
    }
}
