package com.daiphat.coreapi.adapter.in.web.controller.support;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.support.ResolveSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketStaffSummaryResponse;
import com.daiphat.coreapi.application.port.in.support.SupportTicketServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/staff/tickets")
@RequiredArgsConstructor
@Validated
public class StaffSupportTicketController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final SupportTicketServicePort supportTicketServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<PageResponse<SupportTicketStaffSummaryResponse>> getTickets(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String statuses,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID assignedTo,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String direction) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu hỗ trợ thành công.",
                supportTicketServicePort.getTicketsForStaff(
                        page, limit, statuses, search, assignedTo, sortBy, direction));
    }

    @PutMapping(ID_PATH + "/assign")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<SupportTicketResponse> assign(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Tiếp nhận yêu cầu hỗ trợ thành công.",
                supportTicketServicePort.assignByStaff(id, principal.getId()));
    }

    @PutMapping(ID_PATH + "/resolve")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<SupportTicketResponse> resolve(
            @PathVariable Long id,
            @Valid @RequestBody ResolveSupportTicketRequest request,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Giải quyết yêu cầu hỗ trợ thành công.",
                supportTicketServicePort.resolveByStaff(id, principal.getId(), request));
    }
}
