package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.adapter.in.web.constants.ApiConstants;
import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping(ApiConstants.API_V1 + "/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private static final String DEFAULT_PAGE = "1";
    private static final String DEFAULT_CUSTOMER_LIMIT = "4";
    private static final String DEFAULT_ADMIN_LIMIT = "5";

    private final NotificationServicePort notificationServicePort;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_CUSTOMER_LIMIT) int limit
    ) {
        return ApiResponse.success(
                null,
                notificationServicePort.getMyNotifications(principal.getId(), page, limit)
        );
    }

    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> markMyNotificationAsRead(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @PathVariable Long id
    ) {
        notificationServicePort.markMyNotificationAsRead(principal.getId(), id);
        return ApiResponse.success("Đã đánh dấu thông báo là đã đọc.");
    }

    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> markAllMyNotificationsAsRead(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal
    ) {
        notificationServicePort.markAllMyNotificationsAsRead(principal.getId());
        return ApiResponse.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    }

    @GetMapping(ApiConstants.ADMIN + "/me")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<PageResponse<NotificationResponse>> getMyAdminNotifications(
            @AuthenticationPrincipal AuthenticatedUserPrincipal principal,
            @RequestParam(defaultValue = DEFAULT_PAGE) int page,
            @RequestParam(defaultValue = DEFAULT_ADMIN_LIMIT) int limit
    ) {
        return ApiResponse.success(
                null,
                notificationServicePort.getMyAdminNotifications(principal.getId(), page, limit)
        );
    }
}
