package com.daiphat.coreapi.adapter.in.web.controller.chat;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.chat.CloseConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.EscalateConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;
import com.daiphat.coreapi.application.dto.response.chat.CustomerChatTimelineResponse;
import com.daiphat.coreapi.application.port.in.chat.ConversationServicePort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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

    @GetMapping("/my/open")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> getMyOpenConversation(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy cuộc trò chuyện đang mở thành công.",
                conversationServicePort.getMyOpenConversationDetail(principal.getId())
        );
    }

    @GetMapping("/my/timeline")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<CustomerChatTimelineResponse> getMyChatTimeline(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) LocalDateTime beforeCreatedAt,
            @RequestParam(required = false) Long beforeId) {
        return ApiResponse.success(
                "Lấy lịch sử hội thoại thành công.",
                conversationServicePort.getMyChatTimeline(
                        principal.getId(),
                        limit,
                        beforeCreatedAt,
                        beforeId
                )
        );
    }

    @GetMapping("/my/{conversationId}")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> getMyConversationDetail(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId) {
        return ApiResponse.success(
                "Lấy chi tiết cuộc trò chuyện thành công.",
                conversationServicePort.getMyConversationDetail(principal.getId(), conversationId)
        );
    }

    @PostMapping("/my/{conversationId}/read")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> markMyConversationAsRead(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId) {
        return ApiResponse.success(
                "Đã cập nhật trạng thái đọc tin nhắn.",
                conversationServicePort.markMyConversationAsRead(principal.getId(), conversationId)
        );
    }

    @PostMapping("/my/{conversationId}/escalate")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STREET_AGENT + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> escalateMyConversation(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId,
            @RequestBody(required = false) EscalateConversationRequest request) {
        EscalationReason reason = request != null && request.reason() != null
                ? request.reason()
                : EscalationReason.CUSTOMER_REQUEST;
        return ApiResponse.success(
                "Đã chuyển yêu cầu cho nhân viên.",
                conversationServicePort.escalateConversation(principal.getId(), conversationId, reason)
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

    @GetMapping("/management/customers/{customerId}/messages")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<CustomerChatTimelineResponse> getCustomerChatTimeline(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable UUID customerId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) LocalDateTime beforeCreatedAt,
            @RequestParam(required = false) Long beforeId) {
        return ApiResponse.success(
                "Lấy lịch sử hội thoại khách hàng thành công.",
                conversationServicePort.getCustomerChatTimeline(
                        principal.getId(),
                        customerId,
                        limit,
                        beforeCreatedAt,
                        beforeId
                )
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

    @PostMapping("/management/{conversationId}/escalate")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> escalateManagementConversation(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId,
            @RequestBody(required = false) EscalateConversationRequest request) {
        EscalationReason reason = request != null && request.reason() != null
                ? request.reason()
                : EscalationReason.STAFF_MANUAL;
        return ApiResponse.success(
                "Đã chuyển hội thoại vào hàng chờ nhân viên.",
                conversationServicePort.escalateConversation(principal.getId(), conversationId, reason)
        );
    }

    @PostMapping("/management/{conversationId}/assign/me")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> assignConversationToMe(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId) {
        return ApiResponse.success(
                "Nhận hội thoại thành công.",
                conversationServicePort.assignConversationToMe(principal.getId(), conversationId)
        );
    }

    @PostMapping("/management/{conversationId}/unassign")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> unassignConversation(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId) {
        return ApiResponse.success(
                "Trả hội thoại về hàng chờ thành công.",
                conversationServicePort.unassignConversation(principal.getId(), conversationId)
        );
    }

    @PostMapping("/management/{conversationId}/close")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<ConversationDetailResponse> closeConversation(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long conversationId,
            @RequestBody(required = false) CloseConversationRequest request) {
        return ApiResponse.success(
                "Đóng hội thoại thành công.",
                conversationServicePort.closeConversation(principal.getId(), conversationId, request)
        );
    }
}
