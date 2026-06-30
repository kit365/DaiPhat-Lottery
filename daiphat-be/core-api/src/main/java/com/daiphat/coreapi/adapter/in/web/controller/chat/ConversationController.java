package com.daiphat.coreapi.adapter.in.web.controller.chat;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/chat/conversations")
@RequiredArgsConstructor
@Validated
public class ConversationController {

    private final ConversationServicePort conversationServicePort;

    @PostMapping("/init")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> initConversation(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestBody(required = false) InitConversationRequest request) {
        return ApiResponse.success(
                "Khởi tạo cuộc trò chuyện thành công.",
                conversationServicePort.initCustomerConversation(principal.getId(), request)
        );
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<List<ConversationResponse>> getMyConversations(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy danh sách cuộc trò chuyện thành công.",
                conversationServicePort.getMyConversations(principal.getId())
        );
    }

    @GetMapping("/management")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<List<ConversationResponse>> getManagementConversations(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy danh sách cuộc trò chuyện quản trị thành công.",
                conversationServicePort.getManagementConversations(principal.getId())
        );
    }

    @GetMapping("/management/{conversationId}")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> getManagementConversationDetail(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId) {
        return ApiResponse.success(
                "Lấy chi tiết cuộc trò chuyện thành công.",
                conversationServicePort.getManagementConversationDetail(principal.getId(), conversationId)
        );
    }
}
