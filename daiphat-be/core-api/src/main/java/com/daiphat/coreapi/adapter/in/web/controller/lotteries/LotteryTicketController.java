package com.daiphat.coreapi.adapter.in.web.controller.lotteries;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.lotteries.CreateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.request.lotteries.UpdateLotteryTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.base.Views;
import com.daiphat.coreapi.application.dto.response.lotteries.LotteryTicketResponse;
import com.daiphat.coreapi.application.port.in.lotteries.LotteryTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.fasterxml.jackson.annotation.JsonView;
import org.springframework.http.converter.json.MappingJacksonValue;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/lottery-tickets")
@RequiredArgsConstructor
@Validated
@Slf4j
public class LotteryTicketController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

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

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:view') or hasAuthority('ROLE_MEMBER')")
    public MappingJacksonValue getById(
            @PathVariable UUID id,
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
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String drawDate,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to query lottery tickets page: {}, size: {}", page, size);
        PageResponse<LotteryTicketResponse> response = lotteryTicketServicePort.getAll(
                page, size, productId, status, drawDate, search, sortBy, direction);

        ApiResponse<PageResponse<LotteryTicketResponse>> apiResponse = ApiResponse.success(null, response);
        MappingJacksonValue mappingJacksonValue = new MappingJacksonValue(apiResponse);
        mappingJacksonValue.setSerializationView(resolveLotteryTicketView(principal));
        return mappingJacksonValue;
    }

    @PutMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLotteryTicketRequest request) {
        log.info("REST request to update lottery ticket: {}", id);
        LotteryTicketResponse response = lotteryTicketServicePort.update(id, request);
        return ApiResponse.success("Cập nhật thông tin vé số thành công.", response);
    }

    @DeleteMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('ticket:delete')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        log.info("REST request to delete lottery ticket: {}", id);
        lotteryTicketServicePort.delete(id);
        return ApiResponse.success("Xóa vé số khỏi kho thành công.");
    }

    @PatchMapping(ID_PATH + "/verify")
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> verify(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        log.info("REST request to verify lottery ticket: {} by user: {}", id, principal.getUsername());
        LotteryTicketResponse response = lotteryTicketServicePort.verify(id, principal.getId());
        return ApiResponse.success("Xác minh vé số thành công.", response);
    }

    @PatchMapping(ID_PATH + "/status")
    @PreAuthorize("hasAnyAuthority('ticket:edit')")
    public ApiResponse<LotteryTicketResponse> changeStatus(
            @PathVariable UUID id,
            @RequestParam String status) {
        log.info("REST request to change lottery ticket status: {} to {}", id, status);
        LotteryTicketResponse response = lotteryTicketServicePort.changeStatus(id, status);
        return ApiResponse.success("Cập nhật trạng thái vé số thành công.", response);
    }
    private Class<?> resolveLotteryTicketView(AuthenticatedUserPrincipal principal) {
        if (principal == null || SecurityContextHolder.getContext().getAuthentication() == null) {
            return Views.Public.class;
        }

        boolean isMemberOnly = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .anyMatch(RoleConstants.ROLE_MEMBER::equals)
                && SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .noneMatch(authority -> RoleConstants.ADMIN.equals(authority)
                        || RoleConstants.ROLE_STAFF_OPERATOR.equals(authority)
                        || RoleConstants.ROLE_STREET_AGENT.equals(authority)
                        || "ticket:view".equals(authority));

        return isMemberOnly ? Views.Public.class : Views.Admin.class;
    }
}
