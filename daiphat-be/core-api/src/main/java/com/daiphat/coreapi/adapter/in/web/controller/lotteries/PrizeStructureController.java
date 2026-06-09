package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.PrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-products/{productId}/prize-structures")
@RequiredArgsConstructor
@Validated
@Slf4j
public class PrizeStructureController {

    private final PrizeStructureServicePort prizeStructureServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<PrizeStructureResponse>> getByProductId(@PathVariable UUID productId) {
        log.info("REST request to get prize structures for product: {}", productId);
        List<PrizeStructureResponse> response = prizeStructureServicePort.getByProductId(productId);
        return ApiResponse.success(null, response);
    }

    @PutMapping
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<List<PrizeStructureResponse>> update(
            @PathVariable UUID productId,
            @RequestBody List<@Valid PrizeStructureRequest> requests) {
        log.info("REST request to update prize structures for product: {} with {} items", productId, requests.size());
        List<PrizeStructureResponse> response = prizeStructureServicePort.updatePrizeStructures(productId, requests);
        return ApiResponse.success("Cập nhật cấu trúc giải thưởng thành công.", response);
    }
}
