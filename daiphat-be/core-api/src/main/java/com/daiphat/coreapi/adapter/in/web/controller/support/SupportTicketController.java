package com.daiphat.coreapi.adapter.in.web.controller.support;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketCommentRequest;
import com.daiphat.coreapi.application.dto.request.support.CreateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.request.support.UpdateSupportTicketRequest;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketCommentResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketResponse;
import com.daiphat.coreapi.application.dto.response.support.SupportTicketSummaryResponse;
import com.daiphat.coreapi.application.port.in.support.SupportTicketServicePort;
import com.daiphat.coreapi.application.dto.response.notification.NotificationReferenceAvailabilityResponse;
import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.shared.util.StorageUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/tickets")
@RequiredArgsConstructor
@Validated
public class SupportTicketController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_LIMIT = "10";
    private static final String ID_PATH = "/{id}";

    private final SupportTicketServicePort supportTicketServicePort;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<SupportTicketResponse> create(
            @Valid @RequestPart("data") CreateSupportTicketRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Tạo yêu cầu hỗ trợ thành công.",
                supportTicketServicePort.create(
                        principal.getId(),
                        request,
                        file != null ? StorageUtils.toUploadRequest(file) : null));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<PageResponse<SupportTicketSummaryResponse>> getMyTickets(
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_LIMIT) int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Lấy danh sách yêu cầu hỗ trợ của bạn thành công.",
                supportTicketServicePort.getMyTickets(principal.getId(), page, limit, status, search));
    }

    @GetMapping(ID_PATH)
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<SupportTicketResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            Authentication authentication) {
        if (isStaff(authentication)) {
            return ApiResponse.success(
                    "Lấy chi tiết yêu cầu hỗ trợ thành công.",
                    supportTicketServicePort.getByIdForStaff(id, principal.getId()));
        }
        try {
            return ApiResponse.success(
                    "Lấy chi tiết yêu cầu hỗ trợ thành công.",
                    supportTicketServicePort.getByIdForCustomer(id, principal.getId()));
        } catch (DomainException ex) {
            if (ex.getErrorCode() == ErrorCode.TICKET_NOT_FOUND) {
                return ApiResponse.success(
                        NotificationReferenceAvailabilityResponse.UNAVAILABLE_MESSAGE,
                        null
                );
            }
            throw ex;
        }
    }

    @PatchMapping(value = ID_PATH, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<SupportTicketResponse> update(
            @PathVariable Long id,
            @Valid @RequestPart("data") UpdateSupportTicketRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Cập nhật yêu cầu hỗ trợ thành công.",
                supportTicketServicePort.updateByCustomer(
                        id,
                        principal.getId(),
                        request,
                        file != null ? StorageUtils.toUploadRequest(file) : null));
    }

    @PatchMapping(ID_PATH + "/close")
    @PreAuthorize("hasAuthority('" + RoleConstants.ROLE_MEMBER + "')")
    public ApiResponse<SupportTicketResponse> close(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal) {
        return ApiResponse.success(
                "Đóng yêu cầu hỗ trợ thành công.",
                supportTicketServicePort.closeByCustomer(id, principal.getId()));
    }

    @GetMapping(ID_PATH + "/comments")
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<java.util.List<SupportTicketCommentResponse>> getComments(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            Authentication authentication) {
        return ApiResponse.success(
                "Lấy lịch sử trao đổi thành công.",
                supportTicketServicePort.getComments(id, principal.getId(), isStaff(authentication)));
    }

    @PostMapping(value = ID_PATH + "/comments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('"
            + RoleConstants.ROLE_MEMBER + "', '"
            + RoleConstants.ROLE_STAFF_OPERATOR + "', '"
            + RoleConstants.ADMIN + "')")
    public ApiResponse<SupportTicketCommentResponse> addComment(
            @PathVariable Long id,
            @Valid @RequestPart("data") CreateSupportTicketCommentRequest request,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            Authentication authentication) {
        return ApiResponse.success(
                "Gửi tin nhắn thành công.",
                supportTicketServicePort.addComment(
                        id,
                        principal.getId(),
                        isStaff(authentication),
                        request,
                        file != null ? StorageUtils.toUploadRequest(file) : null));
    }

    private static boolean isStaff(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> RoleConstants.ROLE_STAFF_OPERATOR.equals(role)
                        || RoleConstants.ADMIN.equals(role));
    }
}
