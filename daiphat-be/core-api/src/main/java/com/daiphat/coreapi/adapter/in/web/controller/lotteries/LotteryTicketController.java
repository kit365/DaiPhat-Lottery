package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.BulkCreateLotteryTicketsRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.storage.StorageResult;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.lotteries.BulkCreateLotteryTicketsResponse;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryTicketStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.converter.json.MappingJacksonValue;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import com.daiphat.coreapi.shared.util.StorageUtils;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-tickets")
@RequiredArgsConstructor
@Validated
@Slf4j
public class LotteryTicketController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";
    private static final String DEFAULT_HOME_SORT_BY = "displayOrder";
    private static final String DEFAULT_HOME_SORT_DIRECTION = "asc";
    private static final String HOME_DEFAULT_DRAW_DATE = "today";

    private final LotteryTicketServicePort lotteryTicketServicePort;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<LotteryTicketResponse> create(
            @Valid @RequestBody CreateLotteryTicketRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to import lottery ticket by user: {}", principal.getUsername());
        LotteryTicketResponse response = lotteryTicketServicePort.create(request, principal.getId());
        return ApiResponse.success("Nhập vé số vào kho thành công.", response);
    }

    @PostMapping("/bulk-import")
    @PreAuthorize("hasAnyAuthority('ticket:create')")
    public ApiResponse<BulkCreateLotteryTicketsResponse> createBulk(
            @Valid @RequestBody BulkCreateLotteryTicketsRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info(
                "REST request to bulk import {} lottery ticket sections by user: {}",
                request.tickets().size(),
                principal.getUsername()
        );
        BulkCreateLotteryTicketsResponse response = lotteryTicketServicePort.createBulk(request, principal.getId());
        return ApiResponse.success("Nhập vé số vào kho thành công.", response);
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:view') or hasAuthority('ROLE_MEMBER')")
    public MappingJacksonValue getById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to get lottery ticket: {}", id);
        ApiResponse<LotteryTicketResponse> apiResponse = ApiResponse.success(null, lotteryTicketServicePort.getById(id));
        MappingJacksonValue mappingJacksonValue = new MappingJacksonValue(apiResponse);
        mappingJacksonValue.setSerializationView(resolveLotteryTicketView(principal));
        return mappingJacksonValue;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ticket:view') or hasAuthority('ROLE_MEMBER')")
    public MappingJacksonValue getAll(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) List<Long> stationIds,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String drawDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to query lottery tickets page: {}, size: {}", page, size);
        PageResponse<LotteryTicketResponse> response = lotteryTicketServicePort.getAll(
                page, size, stationId, stationIds, status, drawDate, search, sortBy, direction);
        ApiResponse<PageResponse<LotteryTicketResponse>> apiResponse = ApiResponse.success(null, response);
        MappingJacksonValue mappingJacksonValue = new MappingJacksonValue(apiResponse);
        mappingJacksonValue.setSerializationView(resolveLotteryTicketView(principal));
        return mappingJacksonValue;
    }

    @GetMapping("/public")
    public MappingJacksonValue getPublicTickets(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) List<Long> stationIds,
            @RequestParam(required = false) String drawDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String searchMode,
            @RequestParam(required = false) List<String> searches,
            @RequestParam(required = false) List<String> tailRanges,
            @RequestParam(required = false) List<String> numberTypes,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        log.info("REST public request to query lottery tickets page: {}, size: {}", page, size);
        PageResponse<LotteryTicketResponse> response = lotteryTicketServicePort.getPublicTickets(
                page, size, stationId, stationIds, drawDate, search,
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.from(searchMode),
                searches, tailRanges, numberTypes,
                sortBy, direction);
        MappingJacksonValue mappingJacksonValue = new MappingJacksonValue(ApiResponse.success(null, response));
        mappingJacksonValue.setSerializationView(Views.Public.class);
        return mappingJacksonValue;
    }

    @GetMapping("/home")
    public MappingJacksonValue getHomeTickets(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int size,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) List<Long> stationIds,
            @RequestParam(defaultValue = HOME_DEFAULT_DRAW_DATE) String drawDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String searchMode,
            @RequestParam(required = false) List<String> searches,
            @RequestParam(required = false) List<String> tailRanges,
            @RequestParam(required = false) List<String> numberTypes,
            @RequestParam(defaultValue = DEFAULT_HOME_SORT_BY) String sortBy,
            @RequestParam(defaultValue = DEFAULT_HOME_SORT_DIRECTION) String direction) {
        log.info("REST home request to query lottery tickets page: {}, size: {}", page, size);
        PageResponse<LotteryTicketResponse> response = lotteryTicketServicePort.getPublicTickets(
                page, size, stationId, stationIds, resolveHomeDrawDate(drawDate), search,
                com.daiphat.coreapi.domain.model.enums.lottery.TicketSearchMode.from(searchMode),
                searches, tailRanges, numberTypes,
                sortBy, direction);
        MappingJacksonValue mappingJacksonValue = new MappingJacksonValue(ApiResponse.success(null, response));
        mappingJacksonValue.setSerializationView(Views.Public.class);
        return mappingJacksonValue;
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLotteryTicketRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to update lottery ticket: {}", id);
        LotteryTicketResponse response = lotteryTicketServicePort.update(id, request, principal.getId());
        return ApiResponse.success("Cập nhật thông tin vé số thành công.", response);
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:delete')")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        log.info("REST request to delete lottery ticket: {}", id);
        lotteryTicketServicePort.delete(id);
        return ApiResponse.success("Xóa vé số khỏi kho thành công.");
    }

    @PatchMapping(ID_PATH + "/verify")
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> verify(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to verify lottery ticket: {} by user: {}", id, principal.getUsername());
        LotteryTicketResponse response = lotteryTicketServicePort.verify(id, principal.getId());
        return ApiResponse.success("Xác minh vé số thành công.", response);
    }

    @PatchMapping(ID_PATH + "/status")
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> changeStatus(
            @PathVariable Long id,
            @RequestParam LotteryTicketStatus status) {
        log.info("REST request to change lottery ticket status: {} to {}", id, status);
        LotteryTicketResponse response = lotteryTicketServicePort.changeStatus(id, status);
        return ApiResponse.success("Cập nhật trạng thái vé số thành công.", response);
    }

    @PostMapping(value = "/images/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ticket:create', 'ticket:edit')")
    public ApiResponse<StorageResult> uploadAsset(@RequestPart("file") MultipartFile file) {
        log.info("REST request to upload lottery ticket asset image");
        return ApiResponse.success(
                "Tải ảnh lên thành công.",
                lotteryTicketServicePort.uploadAsset(StorageUtils.toUploadRequest(file))
        );
    }

    @PostMapping(value = ID_PATH + "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> uploadImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file) {
        log.info("REST request to upload image for lottery ticket: {}", id);
        return ApiResponse.success("Tải ảnh vé số thành công.",
                lotteryTicketServicePort.uploadImage(id, StorageUtils.toUploadRequest(file)));
    }

    private Class<?> resolveLotteryTicketView(AuthenticatedUserPrincipal principal) {
        if (principal == null || SecurityContextHolder.getContext().getAuthentication() == null) {
            return Views.Public.class;
        }

        boolean isMemberOnly = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(RoleConstants.ROLE_MEMBER::equals)
                && SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .noneMatch(authority -> RoleConstants.ADMIN.equals(authority)
                        || RoleConstants.ROLE_STAFF_OPERATOR.equals(authority)
                        || RoleConstants.ROLE_STREET_AGENT.equals(authority)
                        || "ticket:view".equals(authority));

        return isMemberOnly ? Views.Public.class : Views.Admin.class;
    }

    private String resolveHomeDrawDate(String drawDate) {
        var today = com.daiphat.coreapi.shared.util.DrawScheduleUtils.today();
        var defaultSellable = com.daiphat.coreapi.shared.util.DrawScheduleUtils.resolveDefaultSellableDrawDate();

        if (drawDate == null || drawDate.isBlank() || HOME_DEFAULT_DRAW_DATE.equalsIgnoreCase(drawDate)) {
            return defaultSellable.toString();
        }
        if ("tomorrow".equalsIgnoreCase(drawDate.trim())) {
            return today.plusDays(1).toString();
        }
        // Explicit calendar today after cutoff → roll to tomorrow (no longer sellable).
        if (drawDate.trim().equals(today.toString()) && !defaultSellable.equals(today)) {
            return defaultSellable.toString();
        }
        return drawDate;
    }
}
