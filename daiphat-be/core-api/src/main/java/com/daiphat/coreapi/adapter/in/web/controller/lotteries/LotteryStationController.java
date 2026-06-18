package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import com.daiphat.coreapi.shared.util.StorageUtils;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-stations")
@RequiredArgsConstructor
@Slf4j
public class LotteryStationController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final LotteryStationServicePort lotteryStationServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<LotteryStationResponse> create(
            @Valid @RequestBody CreateLotteryStationRequest request) {
        LotteryStationResponse response = lotteryStationServicePort.create(request);
        return ApiResponse.success("Tạo sản phẩm vé số thành công.", response);
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryStationSyncResponse> syncStations(
            @Valid @RequestBody SyncLotteryStationsRequest request) {
        return ApiResponse.success("Đồng bộ nhà đài thành công.", lotteryStationServicePort.syncStations(request));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<LotteryStationResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, lotteryStationServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view')")
    public ApiResponse<PageResponse<LotteryStationResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) List<String> drawDay,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {

        return ApiResponse.success(null,
                lotteryStationServicePort.getAll(page, size, search, status, type, region, drawDay, sortBy, direction));
    }

    @GetMapping("/draws/today")
    public ApiResponse<List<LotteryStationResponse>> getDrawingToday() {
        return ApiResponse.success(null, lotteryStationServicePort.getDrawingToday());
    }

    @GetMapping("/draws/tomorrow")
    public ApiResponse<List<LotteryStationResponse>> getDrawingTomorrow() {
        return ApiResponse.success(null, lotteryStationServicePort.getDrawingTomorrow());
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryStationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotteryStationRequest request) {
        LotteryStationResponse response = lotteryStationServicePort.update(id, request);
        return ApiResponse.success("Cập nhật sản phẩm vé số thành công.", response);
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        lotteryStationServicePort.delete(id);
        return ApiResponse.success("Xóa sản phẩm vé số thành công.");
    }

    @PostMapping(value = ID_PATH + "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryStationResponse> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success("Tải ảnh nhà đài thành công.",
                lotteryStationServicePort.uploadImage(id, StorageUtils.toUploadRequest(file)));
    }
}
