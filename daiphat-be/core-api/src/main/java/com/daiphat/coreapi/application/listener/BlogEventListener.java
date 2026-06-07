package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.BlogPostPublishedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BlogEventListener {

    private static final List<String> BLOG_NOTIFICATION_ROLE_CODES = List.of(
            RoleConstants.ADMIN,
            RoleConstants.ROLE_STAFF_OPERATOR
    );

    private final UserRepositoryPort userRepositoryPort;
    private final NotificationServicePort notificationService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBlogPostPublished(BlogPostPublishedEvent event) {
        final String inAppTitle = "Bài viết mới đã được đăng";
        final String inAppContent = "Bài viết \"" + event.title() + "\" đã được xuất bản thành công.";

        log.info("Handling BlogPostPublishedEvent for postId: {}", event.postId());

        userRepositoryPort.findAllByRoleCodes(BLOG_NOTIFICATION_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .forEach(user -> {
                    NotificationModel notification = NotificationModel.builder()
                            .userId(user.getId())
                            .title(inAppTitle)
                            .content(inAppContent)
                            .type(NotificationType.BLOG)
                            .channel(NotificationChannel.IN_APP)
                            .referenceId(String.valueOf(event.postId()))
                            .referenceType(NotificationReferenceType.BLOG_POST)
                            .build();
                    notification.markAsSent();
                    notificationService.createNotification(notification);
                });
    }
}
