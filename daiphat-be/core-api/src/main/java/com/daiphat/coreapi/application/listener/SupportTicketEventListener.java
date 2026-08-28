package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.SupportTicketAssignedEvent;
import com.daiphat.coreapi.application.event.SupportTicketClosedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCommentAddedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCreatedEvent;
import com.daiphat.coreapi.application.event.SupportTicketRejectedEvent;
import com.daiphat.coreapi.application.event.SupportTicketReopenedEvent;
import com.daiphat.coreapi.application.event.SupportTicketResolvedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationAudience;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationChannel;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationReferenceType;
import com.daiphat.coreapi.domain.model.enums.notification.NotificationType;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.user.UserStatus;
import com.daiphat.coreapi.domain.model.notifications.NotificationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SupportTicketEventListener {

    private static final List<String> OPERATOR_ROLE_CODES = List.of(
            RoleConstants.ADMIN,
            RoleConstants.ROLE_STAFF_OPERATOR
    );

    private final NotificationServicePort notificationService;
    private final UserRepositoryPort userRepositoryPort;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketCreated(SupportTicketCreatedEvent event) {
        log.info("Handling SupportTicketCreatedEvent for ticketId: {}", event.ticketId());

        if (event.customerId() != null) {
            notifyCustomer(
                    event.customerId(),
                    "Ghi nhận yêu cầu hỗ trợ",
                    String.format("Yêu cầu hỗ trợ về %s: \"%s\" của bạn đã được hệ thống ghi nhận thành công. Nhân viên của chúng tôi sẽ sớm tiếp nhận và phản hồi.",
                            event.categoryName(), event.title()),
                    event.ticketId()
            );
        }

        notifyOperators(
                "Yêu cầu hỗ trợ mới",
                String.format("Khách hàng vừa tạo yêu cầu mới về %s: \"%s\".",
                        event.categoryName(), event.title()),
                event.ticketId(),
                null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketCommentAdded(SupportTicketCommentAddedEvent event) {
        log.info("Handling SupportTicketCommentAddedEvent for ticketId: {}", event.ticketId());

        if (event.senderRole() == TicketCommentSenderRole.CUSTOMER) {
            notifyOperators(
                    "Khách hàng đã phản hồi yêu cầu hỗ trợ",
                    String.format("Yêu cầu hỗ trợ về %s: \"%s\" có tin nhắn mới từ khách hàng.",
                            event.categoryName(), event.title()),
                    event.ticketId(),
                    event.assignedTo());
            return;
        }

        if (event.senderRole() == TicketCommentSenderRole.OPERATOR && event.customerId() != null) {
            notifyCustomer(
                    event.customerId(),
                    "Nhân viên đã phản hồi yêu cầu hỗ trợ",
                    String.format("Yêu cầu hỗ trợ về %s: \"%s\" có tin nhắn mới từ nhân viên hỗ trợ.",
                            event.categoryName(), event.title()),
                    event.ticketId());
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketAssigned(SupportTicketAssignedEvent event) {
        log.info("Handling SupportTicketAssignedEvent for ticketId: {}", event.ticketId());

        if (event.customerId() == null) {
            return;
        }

        notifyCustomer(
                event.customerId(),
                "Yêu cầu hỗ trợ đang được xử lý",
                String.format("%s đã tiếp nhận yêu cầu hỗ trợ về %s: \"%s\".",
                        event.staffName(), event.categoryName(), event.title()),
                event.ticketId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketResolved(SupportTicketResolvedEvent event) {
        log.info("Handling SupportTicketResolvedEvent for ticketId: {}", event.ticketId());

        if (event.customerId() == null) {
            return;
        }

        notifyCustomer(
                event.customerId(),
                "Yêu cầu hỗ trợ đã được giải quyết",
                String.format("Yêu cầu hỗ trợ về %s: \"%s\" đã được nhân viên giải quyết. Vui lòng xác nhận bạn có hài lòng với phương án này.",
                        event.categoryName(), event.title()),
                event.ticketId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketRejected(SupportTicketRejectedEvent event) {
        log.info("Handling SupportTicketRejectedEvent for ticketId: {}", event.ticketId());

        if (event.customerId() == null) {
            return;
        }

        notifyCustomer(
                event.customerId(),
                "Yêu cầu hỗ trợ đã bị từ chối",
                String.format("Yêu cầu hỗ trợ về %s: \"%s\" đã bị từ chối vì không hợp lệ hoặc không đủ điều kiện. Vui lòng xem lý do trong lịch sử trao đổi.",
                        event.categoryName(), event.title()),
                event.ticketId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketReopened(SupportTicketReopenedEvent event) {
        log.info("Handling SupportTicketReopenedEvent for ticketId: {}", event.ticketId());

        notifyOperators(
                "Khách hàng chưa hài lòng với phương án giải quyết",
                String.format("Yêu cầu hỗ trợ về %s: \"%s\" đã được mở lại và đang chờ tiếp nhận.",
                        event.categoryName(), event.title()),
                event.ticketId(),
                null);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketClosed(SupportTicketClosedEvent event) {
        log.info("Handling SupportTicketClosedEvent for ticketId: {}", event.ticketId());

        if (event.customerId() == null) {
            return;
        }

        if (event.autoClosed()) {
            notifyCustomer(
                    event.customerId(),
                    "Yêu cầu hỗ trợ đã tự động đóng",
                    String.format("Yêu cầu hỗ trợ về %s: \"%s\" đã được đóng tự động vì không có phản hồi sau khi giải quyết.",
                            event.categoryName(), event.title()),
                    event.ticketId());
            return;
        }

        notifyCustomer(
                event.customerId(),
                "Yêu cầu hỗ trợ đã đóng",
                String.format(
                        "Yêu cầu hỗ trợ về %s: \"%s\" đã được đóng.",
                        event.categoryName(), event.title()),
                event.ticketId());
    }

    private void notifyOperators(String title, String content, Long ticketId, UUID assignedTo) {
        if (assignedTo != null) {
            notifyStaff(assignedTo, title, content, ticketId);
            return;
        }

        userRepositoryPort.findAllByRoleCodes(OPERATOR_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(UserModel::getId)
                .distinct()
                .forEach(userId -> notifyStaff(userId, title, content, ticketId));
    }

    private void notifyCustomer(UUID userId, String title, String content, Long ticketId) {
        notifyUser(userId, title, content, ticketId, NotificationAudience.CUSTOMER);
    }

    private void notifyStaff(UUID userId, String title, String content, Long ticketId) {
        notifyUser(userId, title, content, ticketId, NotificationAudience.STAFF);
    }

    private void notifyUser(
            UUID userId,
            String title,
            String content,
            Long ticketId,
            NotificationAudience audience
    ) {
        NotificationModel notification = NotificationModel.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .type(NotificationType.SYSTEM)
                .channel(NotificationChannel.IN_APP)
                .audience(audience)
                .referenceId(String.valueOf(ticketId))
                .referenceType(NotificationReferenceType.SUPPORT_TICKET)
                .build();
        notification.markAsSent();
        notificationService.createNotification(notification);
    }
}
