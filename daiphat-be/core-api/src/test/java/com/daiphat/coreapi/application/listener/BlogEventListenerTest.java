package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.BlogPostPublishedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.notification.FcmPushPort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.auth.RoleModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationStatus;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BlogEventListener Unit Tests")
class BlogEventListenerTest {

    private static final UUID ADMIN_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID OPERATOR_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private UserRepositoryPort userRepositoryPort;

    @Mock
    private NotificationServicePort notificationService;

    @Mock
    private FcmPushPort fcmPushPort;

    private BlogEventListener blogEventListener;

    @BeforeEach
    void setUp() {
        blogEventListener = new BlogEventListener(userRepositoryPort, notificationService, fcmPushPort);
    }

    @Test
    @DisplayName("[DP-448] Gửi thông báo khi bài viết được publish thành công")
    void handleBlogPostPublished_success_notifiesActiveAdminsAndOperators() {
        BlogPostPublishedEvent event = BlogPostPublishedEvent.builder()
                .postId(88L)
                .title("Bài viết mới")
                .build();
        UserModel admin = UserModel.builder()
                .id(ADMIN_ID)
                .status(UserStatus.ACTIVE)
                .role(RoleModel.builder().code(RoleConstants.ADMIN).build())
                .build();
        UserModel operator = UserModel.builder()
                .id(OPERATOR_ID)
                .status(UserStatus.ACTIVE)
                .role(RoleModel.builder().code(RoleConstants.ROLE_STAFF_OPERATOR).build())
                .build();

        when(userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN, RoleConstants.ROLE_STAFF_OPERATOR)))
                .thenReturn(List.of(admin, operator));

        blogEventListener.handleBlogPostPublished(event);

        ArgumentCaptor<NotificationModel> captor = ArgumentCaptor.forClass(NotificationModel.class);
        verify(notificationService, org.mockito.Mockito.times(2)).createNotification(captor.capture());
        List<NotificationModel> notifications = captor.getAllValues();
        assertThat(notifications).hasSize(2);
        assertThat(notifications).extracting(NotificationModel::getUserId)
                .containsExactlyInAnyOrder(ADMIN_ID, OPERATOR_ID);
        assertThat(notifications).allSatisfy(notification -> {
            assertThat(notification.getTitle()).isEqualTo("Bài viết mới đã được đăng");
            assertThat(notification.getContent()).contains("Bài viết mới");
            assertThat(notification.getType()).isEqualTo(NotificationType.BLOG);
            assertThat(notification.getChannel()).isEqualTo(NotificationChannel.IN_APP);
            assertThat(notification.getReferenceId()).isEqualTo("88");
            assertThat(notification.getReferenceType()).isEqualTo(NotificationReferenceType.BLOG_POST);
            assertThat(notification.getStatus()).isEqualTo(NotificationStatus.SENT);
        });
    }

    @Test
    @DisplayName("[DP-448] Bỏ qua user bị khóa khi gửi thông báo bài viết")
    void handleBlogPostPublished_skipsInactiveOperators() {
        BlogPostPublishedEvent event = BlogPostPublishedEvent.builder()
                .postId(88L)
                .title("Bài viết mới")
                .build();
        UserModel inactiveOperator = UserModel.builder()
                .id(OPERATOR_ID)
                .status(UserStatus.BANNED)
                .role(RoleModel.builder().code(RoleConstants.ROLE_STAFF_OPERATOR).build())
                .build();

        when(userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN, RoleConstants.ROLE_STAFF_OPERATOR)))
                .thenReturn(List.of(inactiveOperator));

        blogEventListener.handleBlogPostPublished(event);

        verify(notificationService, never()).createNotification(any());
    }

    @Test
    @DisplayName("[DP-448] Không làm gì nếu không có admin/operator nào")
    void handleBlogPostPublished_noOperators_doesNothing() {
        BlogPostPublishedEvent event = BlogPostPublishedEvent.builder()
                .postId(88L)
                .title("Bài viết mới")
                .build();
        when(userRepositoryPort.findAllByRoleCodes(List.of(RoleConstants.ADMIN, RoleConstants.ROLE_STAFF_OPERATOR)))
                .thenReturn(List.of());

        blogEventListener.handleBlogPostPublished(event);

        verify(notificationService, never()).createNotification(any());
    }
}
