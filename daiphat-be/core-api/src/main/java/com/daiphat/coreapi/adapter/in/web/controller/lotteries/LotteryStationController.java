package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.request.lotteries.ConfirmSyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryStationsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryStationRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSchedulePublicResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncPreviewResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryStationSyncResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryStationServicePort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import com.daiphat.coreapi.shared.util.StorageUtils;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

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
    @PreAuthorize("hasAnyAuthority('station:create', 'provider:create')")
    public ApiResponse<LotteryStationResponse> create(
            @Valid @RequestBody CreateLotteryStationRequest request) {
        LotteryStationResponse response = lotteryStationServicePort.create(request);
        return ApiResponse.success("Tạo nhà đài thành công.", response);
    }

    @PostMapping("/sync")
    @PreAuthorize("hasAuthority('station:sync')")
    public ApiResponse<LotteryStationSyncPreviewResponse> previewSyncStations(
            @Valid @RequestBody SyncLotteryStationsRequest request) {
        return ApiResponse.success("Xem trước đồng bộ nhà đài thành công.", lotteryStationServicePort.previewSyncStations(request));
    }

    @PostMapping("/sync/confirm")
    @PreAuthorize("hasAuthority('station:sync')")
    public ApiResponse<LotteryStationSyncResponse> confirmSyncStations(
            @Valid @RequestBody ConfirmSyncLotteryStationsRequest request) {
        return ApiResponse.success("Lưu đồng bộ nhà đài thành công.", lotteryStationServicePort.confirmSyncStations(request));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('station:view', 'provider:view')")
    public ApiResponse<LotteryStationResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, lotteryStationServicePort.getById(id));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('station:view', 'provider:view')")
    public ApiResponse<PageResponse<LotteryStationResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) List<String> region,
            @RequestParam(required = false) List<String> drawDay,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {

        return ApiResponse.success(null,
                lotteryStationServicePort.getAll(
                        page,
                        size,
                        search,
                        status,
                        type,
                        joinFilterValues(region),
                        joinFilterValues(drawDay),
                        isActive,
                        sortBy,
                        direction));
    }

    private static String joinFilterValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        String joined = values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .collect(Collectors.joining(","));
        return joined.isBlank() ? null : joined;
    }

    @GetMapping("/schedule/today")
    public ApiResponse<List<LotteryStationResponse>> getDrawingToday() {
        return ApiResponse.success(null, lotteryStationServicePort.getDrawingToday());
    }

    @GetMapping("/schedule")
    public ApiResponse<List<LotteryStationResponse>> getByDrawDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate
    ) {
        return ApiResponse.success(null, lotteryStationServicePort.getByDrawDate(drawDate));
    }

    @GetMapping("/schedule/tomorrow")
    public ApiResponse<List<LotteryStationResponse>> getDrawingTomorrow() {
        return ApiResponse.success(null, lotteryStationServicePort.getDrawingTomorrow());
    }

    @GetMapping("/schedule/all")
    @Operation(
            summary = "Lay lich quay mo thuong public",
            description = "API public phuc vu trang lich mo thuong. Tra ve danh sach nha dai dang active, chi gom ten dai, ma mien, thu quay va gio quay."
    )
    public ApiResponse<List<LotteryStationSchedulePublicResponse>> getPublicSchedule(
            @Parameter(
                    description = "Loc theo ma mien neu can. Bo trong de lay toan quoc.",
                    example = "MIEN_NAM"
            )
            @RequestParam(required = false) String region,
            @Parameter(description = "Loc theo id nha dai cu the.")
            @RequestParam(required = false) Long stationId,
            @Parameter(description = "Loc theo danh sach id nha dai (vd: 1,2,3).")
            @RequestParam(required = false) List<Long> stationIds,
            @Parameter(description = "Loc theo ngay quay (yyyy-MM-dd). Chi giu cac dai co lich quay vao thu tuong ung.")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate
    ) {
        return ApiResponse.success(
                null,
                lotteryStationServicePort.getPublicSchedule(region, stationId, stationIds, drawDate)
        );
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('station:edit', 'provider:edit')")
    public ApiResponse<LotteryStationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotteryStationRequest request) {
        LotteryStationResponse response = lotteryStationServicePort.update(id, request);
        return ApiResponse.success("Cập nhật nhà đài thành công.", response);
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('station:delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        lotteryStationServicePort.delete(id);
        return ApiResponse.success("Xóa nhà đài thành công.");
    }

    @PostMapping(value = ID_PATH + "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('station:edit', 'provider:edit')")
    public ApiResponse<LotteryStationResponse> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        return ApiResponse.success("Tải ảnh nhà đài thành công.",
                lotteryStationServicePort.uploadImage(id, StorageUtils.toUploadRequest(file)));
    }
}
