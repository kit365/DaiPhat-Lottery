package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncPrizeStructuresRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureSyncResponse;
import com.daiphat.coreapi.application.port.in.lotteries.PrizeStructureServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1)
@RequiredArgsConstructor
@Validated
@Slf4j
public class PrizeStructureController {

    private static final String REGION_PRIZE_STRUCTURES = "/prize-structures/regions";
    private static final String REGION_PRIZE_STRUCTURES_BY_REGION = REGION_PRIZE_STRUCTURES + "/{region}";
    private static final String REGION_PRIZE_STRUCTURE_BY_ID = REGION_PRIZE_STRUCTURES_BY_REGION + "/{id}";
    private static final String REGION_PRIZE_STRUCTURES_SYNC = REGION_PRIZE_STRUCTURES + "/sync";

    private final PrizeStructureServicePort prizeStructureServicePort;

    @GetMapping(REGION_PRIZE_STRUCTURES)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<String>> getRegions() {
        return ApiResponse.success(null, prizeStructureServicePort.getRegions());
    }

    @GetMapping(REGION_PRIZE_STRUCTURES_BY_REGION)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<PrizeStructureResponse>> getByRegion(@PathVariable String region) {
        log.info("REST request to get prize structures for region: {}", region);
        return ApiResponse.success(null, prizeStructureServicePort.getByRegion(region));
    }

    @PostMapping(REGION_PRIZE_STRUCTURES_SYNC)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<PrizeStructureSyncResponse> syncByRegion(
            @Valid @RequestBody SyncPrizeStructuresRequest request) {
        log.info("REST request to sync prize structures for region={} from source={}", request.region(), request.source());
        return ApiResponse.success(
                "Đồng bộ cấu trúc giải theo miền thành công.",
                prizeStructureServicePort.syncByRegion(request)
        );
    }

    @GetMapping(REGION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<PrizeStructureResponse> getRegionPrizeById(
            @PathVariable String region,
            @PathVariable Long id) {
        return ApiResponse.success(null, prizeStructureServicePort.getById(region, id));
    }

    @PostMapping(REGION_PRIZE_STRUCTURES_BY_REGION)
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<PrizeStructureResponse> createForRegion(
            @PathVariable String region,
            @Valid @RequestBody RegionPrizeStructureRequest request) {
        PrizeStructureResponse response = prizeStructureServicePort.create(region, request);
        return ApiResponse.success("Tạo cấu trúc giải theo miền thành công.", response);
    }

    @PutMapping(REGION_PRIZE_STRUCTURES_BY_REGION)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<List<PrizeStructureResponse>> replaceByRegion(
            @PathVariable String region,
            @RequestBody List<@Valid RegionPrizeStructureRequest> requests) {
        log.info("REST request to replace prize structures for region: {} with {} items",
                region, requests.size());
        List<PrizeStructureResponse> response =
                prizeStructureServicePort.replaceByRegion(region, requests);
        return ApiResponse.success(
                "Cập nhật cấu trúc giải theo miền thành công.",
                response);
    }

    @PutMapping(REGION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<PrizeStructureResponse> updateForRegion(
            @PathVariable String region,
            @PathVariable Long id,
            @Valid @RequestBody RegionPrizeStructureRequest request) {
        PrizeStructureResponse response = prizeStructureServicePort.update(region, id, request);
        return ApiResponse.success("Cập nhật cấu trúc giải theo miền thành công.", response);
    }

    @DeleteMapping(REGION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:delete')")
    public ApiResponse<Void> deleteForRegion(
            @PathVariable String region,
            @PathVariable Long id) {
        prizeStructureServicePort.delete(region, id);
        return ApiResponse.success("Xóa cấu trúc giải theo miền thành công.");
    }
}
