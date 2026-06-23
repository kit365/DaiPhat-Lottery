package com.daiphat.coreapi.domain.model.support;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import com.daiphat.coreapi.domain.model.enums.support.TicketRefType;
import com.daiphat.coreapi.domain.model.enums.support.TicketStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportTicketModel {

    private Long id;
    private Long ticketCategoryId;
    private UUID customerId;
    private UUID assignedTo;
    private String title;
    private String description;
    private String attachmentUrl;
    private String refId;
    private TicketRefType refType;

    @Builder.Default
    private TicketStatus status = TicketStatus.OPEN;

    private String response;
    private LocalDateTime resolvedAt;
    private LocalDateTime dueAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (this.status == null) {
            this.status = TicketStatus.OPEN;
        }
    }

    public void ensureCommentAllowed() {
        if (this.status == TicketStatus.RESOLVED || this.status == TicketStatus.CLOSED) {
            throw new DomainException(ErrorCode.TICKET_COMMENT_NOT_ALLOWED);
        }
    }

    public static void ensureSenderTurn(
            List<SupportTicketCommentModel> comments, TicketCommentSenderRole senderRole) {
        findLastConversationalComment(comments).ifPresent(last -> {
            if (last.getSenderRole() == senderRole) {
                throw new DomainException(ErrorCode.TICKET_COMMENT_TURN_VIOLATION);
            }
        });
    }

    public static Optional<SupportTicketCommentModel> findLastConversationalComment(
            List<SupportTicketCommentModel> comments) {
        if (comments == null || comments.isEmpty()) {
            return Optional.empty();
        }
        return comments.stream()
                .filter(comment -> comment.getSenderRole() != TicketCommentSenderRole.SYSTEM)
                .reduce((first, second) -> second);
    }

    public void recordOperatorComment() {
        ensureCommentAllowed();
        if (this.status != TicketStatus.RESOLVED && this.status != TicketStatus.CLOSED) {
            this.status = TicketStatus.WAITING_FOR_CUSTOMER;
        }
    }

    public void recordCustomerComment() {
        ensureCommentAllowed();
        if (this.status == TicketStatus.WAITING_FOR_CUSTOMER) {
            this.status = TicketStatus.IN_PROGRESS;
        }
    }

    public void updateByCustomerWhenOpen(
            String title,
            String description,
            String attachmentUrl,
            String refId,
            TicketRefType refType) {
        ensureStatus(TicketStatus.OPEN);
        if (title != null && !title.isBlank()) {
            this.title = title.trim();
        }
        if (description != null && !description.isBlank()) {
            this.description = description.trim();
        }
        if (attachmentUrl != null) {
            this.attachmentUrl = attachmentUrl.isBlank() ? null : attachmentUrl.trim();
        }
        if (refId != null) {
            this.refId = refId.isBlank() ? null : refId.trim();
        }
        if (refType != null) {
            this.refType = refType;
        }
    }

    public void updateAttachmentWhenWaitingForCustomer(String attachmentUrl) {
        ensureStatus(TicketStatus.WAITING_FOR_CUSTOMER);
        if (attachmentUrl == null || attachmentUrl.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT);
        }
        this.attachmentUrl = attachmentUrl.trim();
        this.status = TicketStatus.IN_PROGRESS;
    }

    public void closeByCustomer() {
        if (this.status != TicketStatus.OPEN) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_CLOSE);
        }
        this.status = TicketStatus.CLOSED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void markInProgressByStaff(UUID staffId) {
        if (this.status != TicketStatus.OPEN) {
            return;
        }
        this.status = TicketStatus.IN_PROGRESS;
        this.assignedTo = staffId;
    }

    private void ensureStatus(TicketStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_UPDATE);
        }
    }
}
