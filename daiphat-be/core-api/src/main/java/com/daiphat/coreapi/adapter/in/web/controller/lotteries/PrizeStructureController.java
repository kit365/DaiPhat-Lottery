package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.RegionPrizeStructureRequest;
import com.daiphat.coreapi.application.dto.response.lotteries.PrizeStructureResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.RegionPrizeStructureResponse;
import com.daiphat.coreapi.application.port.in.lotteries.RegionPrizeStructureServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.StationPrizeStructureServicePort;
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

    private static final String STATION_PRIZE_STRUCTURES = "/lottery-stations/{stationId}/prize-structures";
    private static final String STATION_PRIZE_STRUCTURE_BY_ID = STATION_PRIZE_STRUCTURES + "/{id}";

    private final RegionPrizeStructureServicePort regionPrizeStructureServicePort;
    private final StationPrizeStructureServicePort stationPrizeStructureServicePort;

    @GetMapping(REGION_PRIZE_STRUCTURES)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<String>> getRegions() {
        return ApiResponse.success(null, regionPrizeStructureServicePort.getRegions());
    }

    @GetMapping(REGION_PRIZE_STRUCTURES_BY_REGION)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<RegionPrizeStructureResponse>> getByRegion(@PathVariable String region) {
        log.info("REST request to get prize structures for region: {}", region);
        return ApiResponse.success(null, regionPrizeStructureServicePort.getByRegion(region));
    }

    @GetMapping(REGION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<RegionPrizeStructureResponse> getRegionPrizeById(
            @PathVariable String region,
            @PathVariable Long id) {
        return ApiResponse.success(null, regionPrizeStructureServicePort.getById(region, id));
    }

    @PostMapping(REGION_PRIZE_STRUCTURES_BY_REGION)
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<RegionPrizeStructureResponse> createForRegion(
            @PathVariable String region,
            @Valid @RequestBody RegionPrizeStructureRequest request) {
        RegionPrizeStructureResponse response = regionPrizeStructureServicePort.create(region, request);
        return ApiResponse.success("Tạo cấu trúc giải theo miền thành công.", response);
    }

    @PutMapping(REGION_PRIZE_STRUCTURES_BY_REGION)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<List<RegionPrizeStructureResponse>> replaceByRegion(
            @PathVariable String region,
            @RequestBody List<@Valid RegionPrizeStructureRequest> requests) {
        log.info("REST request to replace prize structures for region: {} with {} items",
                region, requests.size());
        List<RegionPrizeStructureResponse> response =
                regionPrizeStructureServicePort.replaceByRegion(region, requests);
        return ApiResponse.success(
                "Cập nhật cấu trúc giải theo miền thành công. Đài đã tạo trước đó không tự cập nhật.",
                response);
    }

    @PutMapping(REGION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<RegionPrizeStructureResponse> updateForRegion(
            @PathVariable String region,
            @PathVariable Long id,
            @Valid @RequestBody RegionPrizeStructureRequest request) {
        RegionPrizeStructureResponse response = regionPrizeStructureServicePort.update(region, id, request);
        return ApiResponse.success(
                "Cập nhật cấu trúc giải theo miền thành công. Đài đã tạo trước đó không tự cập nhật.",
                response);
    }

    @DeleteMapping(REGION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:delete')")
    public ApiResponse<Void> deleteForRegion(
            @PathVariable String region,
            @PathVariable Long id) {
        regionPrizeStructureServicePort.delete(region, id);
        return ApiResponse.success("Xóa cấu trúc giải theo miền thành công.");
    }

    @GetMapping(STATION_PRIZE_STRUCTURES)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<List<PrizeStructureResponse>> getByStationId(@PathVariable Long stationId) {
        log.info("REST request to get prize structures for station: {}", stationId);
        return ApiResponse.success(null, stationPrizeStructureServicePort.getByProductId(stationId));
    }

    @GetMapping(STATION_PRIZE_STRUCTURE_BY_ID)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<PrizeStructureResponse> getStationPrizeById(
            @PathVariable Long stationId,
            @PathVariable Long id) {
        return ApiResponse.success(null, stationPrizeStructureServicePort.getById(stationId, id));
    }
}
