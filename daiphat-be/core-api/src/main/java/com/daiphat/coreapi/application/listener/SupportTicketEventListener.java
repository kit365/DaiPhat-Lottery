package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.event.SupportTicketAssignedEvent;
import com.daiphat.coreapi.application.event.SupportTicketCommentAddedEvent;
import com.daiphat.coreapi.application.event.SupportTicketResolvedEvent;
import com.daiphat.coreapi.application.port.in.notification.NotificationServicePort;
import com.daiphat.coreapi.application.port.out.user.UserRepositoryPort;
import com.daiphat.coreapi.domain.model.UserModel;
import com.daiphat.coreapi.domain.model.enums.auth.RoleConstants;
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
    public void handleSupportTicketCommentAdded(SupportTicketCommentAddedEvent event) {
        log.info("Handling SupportTicketCommentAddedEvent for ticketId: {}", event.ticketId());

        if (event.senderRole() == TicketCommentSenderRole.CUSTOMER) {
            notifyOperators(
                    "Khách hàng đã phản hồi yêu cầu hỗ trợ",
                    "Ticket #" + event.ticketId() + " có tin nhắn mới từ khách hàng.",
                    event.ticketId(),
                    event.assignedTo());
            return;
        }

        if (event.senderRole() == TicketCommentSenderRole.OPERATOR && event.customerId() != null) {
            notifyUser(
                    event.customerId(),
                    "Nhân viên đã phản hồi yêu cầu hỗ trợ",
                    "Ticket #" + event.ticketId() + " có tin nhắn mới từ nhân viên hỗ trợ.",
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

        notifyUser(
                event.customerId(),
                "Yêu cầu hỗ trợ đang được xử lý",
                event.staffName() + " đã tiếp nhận ticket #" + event.ticketId() + ".",
                event.ticketId());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleSupportTicketResolved(SupportTicketResolvedEvent event) {
        log.info("Handling SupportTicketResolvedEvent for ticketId: {}", event.ticketId());

        if (event.customerId() == null) {
            return;
        }

        notifyUser(
                event.customerId(),
                "Yêu cầu hỗ trợ đã được giải quyết",
                "Ticket #" + event.ticketId() + " đã được nhân viên giải quyết.",
                event.ticketId());
    }

    private void notifyOperators(String title, String content, Long ticketId, UUID assignedTo) {
        if (assignedTo != null) {
            notifyUser(assignedTo, title, content, ticketId);
            return;
        }

        userRepositoryPort.findAllByRoleCodes(OPERATOR_ROLE_CODES).stream()
                .filter(user -> user.getStatus() == UserStatus.ACTIVE)
                .map(UserModel::getId)
                .distinct()
                .forEach(userId -> notifyUser(userId, title, content, ticketId));
    }

    private void notifyUser(UUID userId, String title, String content, Long ticketId) {
        NotificationModel notification = NotificationModel.builder()
                .userId(userId)
                .title(title)
                .content(content)
                .type(NotificationType.SYSTEM)
                .channel(NotificationChannel.IN_APP)
                .referenceId(String.valueOf(ticketId))
                .referenceType(NotificationReferenceType.SUPPORT_TICKET)
                .build();
        notification.markAsSent();
        notificationService.createNotification(notification);
    }
}
