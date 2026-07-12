package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.ResyncLotteryResultRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.SyncLotteryResultsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultDetailRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryResultRequest;
import com.daiphat.coreapi.application.dto.lotteries.LotteryResultSourcePreviewResult;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.ManagementLotteryResultBoardResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultDetailResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardDetailsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultBoardSummaryResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultFullBoardResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryResultSyncBatchResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryWinningCheckResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultDetailServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultSourceServicePort;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryResultServicePort;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryStationSourceType;
import com.fasterxml.jackson.annotation.JsonView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-results")
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(
        name = "Lottery Result Controller",
        description = "API ket qua xo so. Luu y drawDate, fromDate, toDate phai nhap theo dinh dang YYYY-MM-DD, vi du 2026-06-20."
)
public class LotteryResultController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";
    private static final String DETAIL_PATH = ID_PATH + "/details";
    private static final String DETAIL_ID_PATH = DETAIL_PATH + "/{detailId}";

    private final LotteryResultServicePort lotteryResultServicePort;
    private final LotteryResultDetailServicePort lotteryResultDetailServicePort;
    private final LotteryResultSourceServicePort lotteryResultSourceServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('lotteryResult:create', 'ticket:create')")
    @Operation(
            summary = "Tao ket qua xo so thu cong",
            description = "Dung cho back-office khi can tao row ket qua thu cong. Thuong phase hien tai uu tien dung API live/summary/sync hon."
    )
    public ApiResponse<LotteryResultResponse> create(@Valid @RequestBody CreateLotteryResultRequest request) {
        return ApiResponse.success("Tạo kết quả quay số thành công.", lotteryResultServicePort.create(request));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('lotteryResult:view', 'ticket:view')")
    @Operation(
            summary = "Lay danh sach ket qua xo so",
            description = "API phan trang de xem danh sach row ket qua da luu trong DB."
    )
    public ApiResponse<PageResponse<LotteryResultResponse>> getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size) {
        return ApiResponse.success(null, lotteryResultServicePort.getAll(page, size));
    }

    @GetMapping("/board/full")
    @JsonView(Views.Public.class)
    @Operation(
            summary = "Lay full board ket qua cho 1 ngay",
            description = """
                    API public gon cho trang client khi can lay full board trong 1 call.
                    Chi tra du lieu can de ve bang ket qua: thong tin dai, ngay quay, status, prizeCode va winningNumber.
                    Khong tra audit fields, khong tra cau truc giai.
                    
                    Cach test nhanh:
                    - region: MIEN_NAM
                    - drawDate: 2026-06-20
                    - source: MINH_NGOC
                    
                    Khi ket qua chua ve du, API van tra board + status de FE hien countdown/waiting.
                    """
    )
    public ApiResponse<LotteryResultFullBoardResponse> getFullBoard(
            @Parameter(
                    description = "Ma mien can xem. Gia tri dung hien tai: MIEN_NAM, MIEN_TRUNG, MIEN_BAC.",
                    example = "MIEN_NAM"
            )
            @RequestParam String region,
            @Parameter(
                    description = "Ngay quay can xem theo dinh dang YYYY-MM-DD.",
                    example = "2026-06-20"
            )
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @Parameter(
                    description = "Nguon crawl ket qua. Thuong de mac dinh MINH_NGOC.",
                    example = "MINH_NGOC"
            )
            @RequestParam(defaultValue = LotteryStationSourceType.DEFAULT_VALUE) LotteryStationSourceType source
    ) {
        return ApiResponse.success(
                null,
                lotteryResultServicePort.getFullBoard(region, drawDate, source)
        );
    }

    @GetMapping("/management/board")
    @PreAuthorize("hasAnyAuthority('lotteryResult:view', 'ticket:view')")
    @Operation(
            summary = "Lay full board ket qua cho man quan tri",
            description = """
                    API quan tri tra board ket qua cho 1 ngay hoac 1 khoang ngay, gom result va cac detail da co trong DB.
                    Contract nay chi phuc vu quan tri ket qua, khong kem cau truc giai.
                    
                    Cach test:
                    - 1 ngay: fromDate = toDate = 2026-06-20
                    - khoang ngay: fromDate = 2026-06-18, toDate = 2026-06-20
                    - region: MIEN_NAM
                    - source: MINH_NGOC
                    
                    API nay can token co quyen lotteryResult:view hoac ticket:view.
                    """
    )
    public ApiResponse<ManagementLotteryResultBoardResponse> getManagementBoard(
            @Parameter(description = "Ma mien can xem.", example = "MIEN_NAM")
            @RequestParam String region,
            @Parameter(description = "Ngay bat dau theo dinh dang YYYY-MM-DD.", example = "2026-06-18")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @Parameter(description = "Ngay ket thuc theo dinh dang YYYY-MM-DD.", example = "2026-06-20")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @Parameter(description = "Nguon crawl ket qua.", example = "MINH_NGOC")
            @RequestParam(defaultValue = LotteryStationSourceType.DEFAULT_VALUE) LotteryStationSourceType source
    ) {
        return ApiResponse.success(
                null,
                lotteryResultServicePort.getManagementBoard(region, fromDate, toDate, source)
        );
    }

    @PostMapping("/management/sync")
    @PreAuthorize("hasAnyAuthority('lotteryResult:sync', 'ticket:edit')")
    @Operation(summary = "Đồng bộ kết quả theo bộ lọc màn quản trị")
    public ApiResponse<LotteryResultSyncBatchResponse> syncManagementBoard(
            @Valid @RequestBody SyncLotteryResultsRequest request
    ) {
        return ApiResponse.success(
                "Đã đưa các kết quả vào hàng chờ đồng bộ.",
                lotteryResultServicePort.requestBoardSync(request)
        );
    }

    @GetMapping("/board")
    @JsonView(Views.Public.class)
    @Operation(
            summary = "Lay board summary ket qua",
            description = """
                    API summary nhe cho client. Thuong goi truoc API /details.
                    Contract public nay chi tra thong tin toi thieu cua tung ket qua: id, stationId, stationName, drawDate, status.
                    Khong tra createdAt, updatedAt, createdBy, source, publishedAt...
                    
                    Cach nhap:
                    - region: MIEN_NAM
                    - drawDate: 2026-06-20
                    
                    Dinh dang ngay bat buoc la YYYY-MM-DD. Khong nhap 20/06/2026 trong swagger.
                    """
    )
    public ApiResponse<LotteryResultBoardSummaryResponse> getBoardSummary(
            @Parameter(description = "Ma mien can xem.", example = "MIEN_NAM")
            @RequestParam String region,
            @Parameter(description = "Ngay quay theo dinh dang YYYY-MM-DD.", example = "2026-06-20")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate
    ) {
        return ApiResponse.success(
                null,
                lotteryResultServicePort.getBoardSummary(region, drawDate)
        );
    }

    @GetMapping("/details")
    @JsonView(Views.Public.class)
    @Operation(
            summary = "Lay chi tiet cac result",
            description = """
                    API chi tiet de FE ghep vao board sau khi da co danh sach result id tu /board hoac /board/full.
                    Contract public nay chi tra cac cap prizeCode - winningNumber, kem status va pollAfterSeconds de client poll.
                    Khong tra audit fields hay metadata noi bo cua detail.
                    
                    Cach test:
                    - resultIds=1,2,3
                    - hoac bam 'Add string item' trong swagger de them nhieu id
                    
                    API se tra details, status va pollAfterSeconds de FE biet co can poll tiep hay khong.
                    """
    )
    public ApiResponse<LotteryResultBoardDetailsResponse> getBoardDetails(
            @Parameter(
                    description = "Danh sach result id. Co the nhap dang query lap lai hoac comma-separated tuy swagger client, vi du 1,2,3.",
                    example = "1,2,3"
            )
            @RequestParam List<Long> resultIds) {
        return ApiResponse.success(
                null,
                lotteryResultServicePort.getBoardDetails(resultIds)
        );
    }

    @GetMapping("/check")
    @JsonView(Views.Public.class)
    @Operation(
            summary = "Tra cứu kết quả trúng thưởng (public)",
            description = """
                    API public dò số nhanh để kiểm tra một vé có trúng hay không.
                    Nhập stationId, drawDate và ticketNumber.
                    API trả về trạng thái kết quả hiện tại của kỳ quay, tổng tiền trúng và danh sách giải trúng nếu có.
                    """
    )
    public ApiResponse<LotteryWinningCheckResponse> checkWinning(
            @Parameter(description = "ID nhà đài", example = "1")
            @RequestParam Long stationId,
            @Parameter(description = "Ngày quay số theo định dạng YYYY-MM-DD", example = "2026-06-20")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate,
            @Parameter(description = "Số vé cần dò (5 hoặc 6 chữ số)", example = "123456")
            @RequestParam String ticketNumber
    ) {
        return ApiResponse.success(
                null,
                lotteryResultDetailServicePort.checkWinning(stationId, drawDate, ticketNumber)
        );
    }

    @GetMapping("/preview")
    @PreAuthorize("hasAnyAuthority('lotteryResult:view', 'ticket:view')")
    @Operation(
            summary = "Preview nguon crawl ket qua",
            description = """
                    API debug/crawl preview. Dung khi muon xem nguon ngoai dang tra ve gi truoc khi dong bo vao DB.
                    
                    Cach test:
                    - source: MINH_NGOC
                    - stationId: 18
                    - drawDate: 2026-06-20
                    """
    )
    public ApiResponse<LotteryResultSourcePreviewResult> preview(
            @Parameter(description = "Nguon crawl ket qua.", example = "MINH_NGOC")
            @RequestParam(defaultValue = LotteryStationSourceType.DEFAULT_VALUE) LotteryStationSourceType source,
            @Parameter(description = "ID nha dai trong DB.", example = "18")
            @RequestParam Long stationId,
            @Parameter(description = "Ngay quay theo dinh dang YYYY-MM-DD.", example = "2026-06-20")
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate drawDate
    ) {
        return ApiResponse.success(
                "Tra cứu kết quả quay số thành công.",
                lotteryResultSourceServicePort.preview(source, stationId, drawDate)
        );
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:view', 'ticket:view')")
    @Operation(summary = "Lay 1 ket qua xo so theo id")
    public ApiResponse<LotteryResultResponse> getById(@PathVariable Long id) {
        return ApiResponse.success(null, lotteryResultServicePort.getById(id));
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:edit', 'ticket:edit')")
    @Operation(summary = "Cap nhat ket qua xo so thu cong")
    public ApiResponse<LotteryResultResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotteryResultRequest request) {
        return ApiResponse.success("Cập nhật kết quả quay số thành công.", lotteryResultServicePort.update(id, request));
    }

    @PostMapping(ID_PATH + "/resync")
    @PreAuthorize("hasAnyAuthority('lotteryResult:sync', 'ticket:edit')")
    @Operation(
            summary = "Dong bo lai 1 ket qua xo so",
            description = """
                    API dua 1 ket qua vao hang cho dong bo lai.
                    
                    Cach test:
                    - id: id cua lottery result da co trong DB
                    - body co the de trong {}
                    - hoac truyen { "source": "MINH_NGOC" }
                    
                    Chi hop le khi result dang o trang thai cho phep resync theo business rule.
                    """
    )
    public ApiResponse<LotteryResultResponse> resync(
            @PathVariable Long id,
            @RequestBody(required = false) ResyncLotteryResultRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        return ApiResponse.success(
                "Đã đưa kết quả quay số vào hàng chờ đồng bộ lại.",
                lotteryResultServicePort.requestResync(id, request, principal.getId())
        );
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:delete', 'ticket:delete')")
    @Operation(summary = "Xoa 1 ket qua xo so")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        lotteryResultServicePort.delete(id);
        return ApiResponse.success("Xóa kết quả quay số thành công.");
    }

    @GetMapping(DETAIL_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:view', 'ticket:view')")
    @Operation(summary = "Lay danh sach detail cua 1 ket qua")
    public ApiResponse<List<LotteryResultDetailResponse>> getDetails(@PathVariable("id") Long lotteryResultId) {
        return ApiResponse.success(null, lotteryResultDetailServicePort.getByLotteryResultId(lotteryResultId));
    }

    @GetMapping(DETAIL_ID_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:view', 'ticket:view')")
    @Operation(summary = "Lay 1 detail cua ket qua")
    public ApiResponse<LotteryResultDetailResponse> getDetail(
            @PathVariable("id") Long lotteryResultId,
            @PathVariable Long detailId) {
        return ApiResponse.success(null, lotteryResultDetailServicePort.getById(lotteryResultId, detailId));
    }

    @PostMapping(DETAIL_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:create', 'ticket:create')")
    @Operation(summary = "Tao 1 dong detail cho ket qua")
    public ApiResponse<LotteryResultDetailResponse> createDetail(
            @PathVariable("id") Long lotteryResultId,
            @Valid @RequestBody CreateLotteryResultDetailRequest request) {
        return ApiResponse.success(
                "Tạo dòng kết quả quay số thành công.",
                lotteryResultDetailServicePort.create(lotteryResultId, request)
        );
    }

    @PutMapping(DETAIL_ID_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:edit', 'ticket:edit')")
    @Operation(summary = "Cap nhat 1 dong detail cua ket qua")
    public ApiResponse<LotteryResultDetailResponse> updateDetail(
            @PathVariable("id") Long lotteryResultId,
            @PathVariable Long detailId,
            @Valid @RequestBody UpdateLotteryResultDetailRequest request) {
        return ApiResponse.success(
                "Cập nhật dòng kết quả quay số thành công.",
                lotteryResultDetailServicePort.update(lotteryResultId, detailId, request)
        );
    }

    @DeleteMapping(DETAIL_ID_PATH)
    @PreAuthorize("hasAnyAuthority('lotteryResult:delete', 'ticket:delete')")
    @Operation(summary = "Xoa 1 dong detail cua ket qua")
    public ApiResponse<Void> deleteDetail(
            @PathVariable("id") Long lotteryResultId,
            @PathVariable Long detailId) {
        lotteryResultDetailServicePort.delete(lotteryResultId, detailId);
        return ApiResponse.success("Xóa dòng kết quả quay số thành công.");
    }
}
