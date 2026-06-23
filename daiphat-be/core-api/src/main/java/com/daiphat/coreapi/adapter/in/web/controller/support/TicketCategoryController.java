package com.daiphat.coreapi.adapter.in.web.controller.support;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.application.dto.response.support.TicketCategoryResponse;
import com.daiphat.coreapi.application.port.in.support.TicketCategoryServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/ticket-categories")
@RequiredArgsConstructor
public class TicketCategoryController {

    private final TicketCategoryServicePort ticketCategoryServicePort;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<List<TicketCategoryResponse>> getCategories() {
        return ApiResponse.success(
                "Lấy danh sách danh mục yêu cầu hỗ trợ thành công.",
                ticketCategoryServicePort.getActiveCategories());
    }
}
