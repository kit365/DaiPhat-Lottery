package com.daiphat.coreapi.adapter.in.web.controller;

import com.daiphat.coreapi.adapter.in.web.response.ApiResponse;
import com.daiphat.coreapi.adapter.in.web.security.AuthenticatedUserPrincipal;
import com.daiphat.coreapi.application.dto.response.base.PageResponse;
import com.daiphat.coreapi.application.dto.response.notification.NotificationResponse;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.in.notification.NotificationSettingServicePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doNothing;

@ExtendWith(MockitoExtension.class)
@DisplayName("[DP-80] NotificationController Unit Tests")
class NotificationControllerTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private NotificationController notificationController;

    @Mock
    private NotificationServicePort notificationServicePort;

    @Mock
    private NotificationSettingServicePort notificationSettingServicePort;

    @BeforeEach
    void setUp() {
        notificationController = new NotificationController(
                notificationServicePort,
                notificationSettingServicePort
        );
    }

    @Test
    @DisplayName("GET /notifications/me: Lấy danh sách thông báo của customer thành công")
    void getMyNotifications_success() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<NotificationResponse> serviceResponse = PageResponse.<NotificationResponse>builder()
                .recordList(Collections.emptyList())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(0)
                        .totalPages(0)
                        .currentPage(1)
                        .limit(4)
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();

        when(notificationServicePort.getMyNotifications(USER_ID, 1, 4)).thenReturn(serviceResponse);

        ApiResponse<PageResponse<NotificationResponse>> response =
                notificationController.getMyNotifications(principal, 1, 4);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(notificationServicePort).getMyNotifications(USER_ID, 1, 4);
    }

    @Test
    @DisplayName("GET /notifications/me: Truyền page và limit từ request xuống service")
    void getMyNotifications_forwardsCustomPagingParams() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        PageResponse<NotificationResponse> serviceResponse = PageResponse.<NotificationResponse>builder()
                .recordList(Collections.emptyList())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(12)
                        .totalPages(3)
                        .currentPage(2)
                        .limit(4)
                        .isFirst(false)
                        .isLast(false)
                        .build())
                .build();

        when(notificationServicePort.getMyNotifications(USER_ID, 2, 4)).thenReturn(serviceResponse);

        ApiResponse<PageResponse<NotificationResponse>> response =
                notificationController.getMyNotifications(principal, 2, 4);

        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(notificationServicePort).getMyNotifications(USER_ID, 2, 4);
    }

    @Test
    @DisplayName("[DP-426][DP-429] PATCH /notifications/{id}/read: Đánh dấu đã đọc thành công")
    void markMyNotificationAsRead_success() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        when(notificationServicePort.markMyNotificationAsRead(USER_ID, 10L)).thenReturn(null);

        ApiResponse<Void> response = notificationController.markMyNotificationAsRead(principal, 10L);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Đã đánh dấu thông báo là đã đọc.");
        verify(notificationServicePort).markMyNotificationAsRead(USER_ID, 10L);
    }

    @Test
    @DisplayName("[DP-433][DP-436] DELETE /notifications/{id}: Xóa thông báo đã đọc thành công")
    void deleteMyReadNotification_success() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        when(notificationServicePort.deleteMyReadNotification(USER_ID, 10L)).thenReturn(null);

        ApiResponse<Void> response = notificationController.deleteMyReadNotification(principal, 10L);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Đã xóa thông báo đã đọc.");
        verify(notificationServicePort).deleteMyReadNotification(USER_ID, 10L);
    }

    @Test
    @DisplayName("[DP-426][DP-429] PATCH /notifications/read-all: Đánh dấu tất cả thông báo là đã đọc thành công")
    void markAllMyNotificationsAsRead_success() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        doNothing().when(notificationServicePort).markAllMyNotificationsAsRead(USER_ID);

        ApiResponse<Void> response = notificationController.markAllMyNotificationsAsRead(principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Đã đánh dấu tất cả thông báo là đã đọc.");
        verify(notificationServicePort).markAllMyNotificationsAsRead(USER_ID);
    }

    @Test
    @DisplayName("[DP-433][DP-436] DELETE /notifications/read-all: Xóa tất cả thông báo đã đọc thành công")
    void deleteAllMyReadNotifications_success() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "member01");
        doNothing().when(notificationServicePort).deleteAllMyReadNotifications(USER_ID);

        ApiResponse<Void> response = notificationController.deleteAllMyReadNotifications(principal);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Đã xóa tất cả thông báo đã đọc.");
        verify(notificationServicePort).deleteAllMyReadNotifications(USER_ID);
    }

    @Test
    @DisplayName("[DP-416][DP-422] GET /notifications/admin/me: Lấy danh sách thông báo của admin thành công")
    void getMyAdminNotifications_success() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        PageResponse<NotificationResponse> serviceResponse = PageResponse.<NotificationResponse>builder()
                .recordList(Collections.emptyList())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(0)
                        .totalPages(0)
                        .currentPage(1)
                        .limit(5)
                        .isFirst(true)
                        .isLast(true)
                        .build())
                .build();

        when(notificationServicePort.getMyAdminNotifications(USER_ID, 1, 5)).thenReturn(serviceResponse);

        ApiResponse<PageResponse<NotificationResponse>> response =
                notificationController.getMyAdminNotifications(principal, 1, 5);

        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(notificationServicePort).getMyAdminNotifications(USER_ID, 1, 5);
    }

    @Test
    @DisplayName("[DP-416][DP-422] GET /notifications/admin/me: Truyền page và limit từ request xuống service")
    void getMyAdminNotifications_forwardsCustomPagingParams() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(USER_ID, "operator01");
        PageResponse<NotificationResponse> serviceResponse = PageResponse.<NotificationResponse>builder()
                .recordList(Collections.emptyList())
                .pagination(PageResponse.PaginationMetadata.builder()
                        .totalRecords(15)
                        .totalPages(3)
                        .currentPage(2)
                        .limit(5)
                        .isFirst(false)
                        .isLast(false)
                        .build())
                .build();

        when(notificationServicePort.getMyAdminNotifications(USER_ID, 2, 5)).thenReturn(serviceResponse);

        ApiResponse<PageResponse<NotificationResponse>> response =
                notificationController.getMyAdminNotifications(principal, 2, 5);

        assertThat(response.getData()).isEqualTo(serviceResponse);
        verify(notificationServicePort).getMyAdminNotifications(USER_ID, 2, 5);
    }
}
