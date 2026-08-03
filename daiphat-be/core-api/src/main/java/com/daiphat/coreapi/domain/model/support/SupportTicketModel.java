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
    private Long resolvedReasonId;
    private Long rejectedReasonId;
    private LocalDateTime resolvedAt;
    private LocalDateTime dueAt;
    private LocalDateTime customerLastViewedAt;
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
        if (this.status == TicketStatus.RESOLVED
                || this.status == TicketStatus.REJECTED
                || this.status == TicketStatus.CLOSED) {
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

    public void ensureOperatorCanComment() {
        if (this.status == TicketStatus.OPEN) {
            throw new DomainException(ErrorCode.TICKET_OPERATOR_MUST_ASSIGN_FIRST);
        }
    }

    public static Optional<SupportTicketCommentModel> findLastConversationalComment(
            List<SupportTicketCommentModel> comments) {
        if (comments == null || comments.isEmpty()) {
            return Optional.empty();
        }

        List<SupportTicketCommentModel> conversational = comments.stream()
                .filter(comment -> comment.getSenderRole() != TicketCommentSenderRole.SYSTEM)
                .toList();

        if (conversational.isEmpty()) {
            return Optional.empty();
        }

        boolean allHaveCreatedAt = conversational.stream().allMatch(comment -> comment.getCreatedAt() != null);
        if (allHaveCreatedAt) {
            return conversational.stream()
                    .max(java.util.Comparator.comparing(SupportTicketCommentModel::getCreatedAt));
        }

        return Optional.of(conversational.get(conversational.size() - 1));
    }

    public void recordOperatorComment() {
        ensureCommentAllowed();
        if (this.status != TicketStatus.RESOLVED
                && this.status != TicketStatus.REJECTED
                && this.status != TicketStatus.CLOSED) {
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
        if (this.status == TicketStatus.RESOLVED
                || this.status == TicketStatus.REJECTED
                || this.status == TicketStatus.CLOSED) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_CLOSE);
        }
        this.status = TicketStatus.CLOSED;
        this.resolvedAt = LocalDateTime.now();
    }

    /** Customer opened the ticket UI — clears REJECTED attention badge when viewed after rejection. */
    public void markCustomerViewed() {
        this.customerLastViewedAt = LocalDateTime.now();
    }

    public boolean needsRejectedAttention() {
        if (this.status != TicketStatus.REJECTED) {
            return false;
        }
        LocalDateTime decisionAt = this.resolvedAt != null ? this.resolvedAt : this.updatedAt;
        if (decisionAt == null) {
            return this.customerLastViewedAt == null;
        }
        return this.customerLastViewedAt == null || this.customerLastViewedAt.isBefore(decisionAt);
    }

    public void assignByStaff(UUID staffId) {
        if (this.status != TicketStatus.OPEN) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_ASSIGN);
        }
        this.status = TicketStatus.IN_PROGRESS;
        this.assignedTo = staffId;
    }

    public void resolveByStaff(Long reasonCommentId, String resolution) {
        if (this.status != TicketStatus.IN_PROGRESS && this.status != TicketStatus.WAITING_FOR_CUSTOMER) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_RESOLVE);
        }
        if (resolution == null || resolution.isBlank()) {
            throw new DomainException(ErrorCode.TICKET_RESOLUTION_INVALID);
        }
        if (reasonCommentId == null) {
            throw new DomainException(ErrorCode.TICKET_REASON_COMMENT_REQUIRED);
        }
        this.response = resolution.trim();
        this.resolvedReasonId = reasonCommentId;
        this.rejectedReasonId = null;
        this.resolvedAt = LocalDateTime.now();
        // Staff marks resolved only after customer already agreed — close immediately.
        this.status = TicketStatus.CLOSED;
    }

    public void rejectByStaff(Long reasonCommentId, String rejectionReason) {
        if (this.status != TicketStatus.IN_PROGRESS && this.status != TicketStatus.WAITING_FOR_CUSTOMER) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_REJECT);
        }
        if (rejectionReason == null || rejectionReason.isBlank()) {
            throw new DomainException(ErrorCode.TICKET_RESOLUTION_INVALID);
        }
        if (reasonCommentId == null) {
            throw new DomainException(ErrorCode.TICKET_REASON_COMMENT_REQUIRED);
        }
        this.response = rejectionReason.trim();
        this.rejectedReasonId = reasonCommentId;
        this.resolvedReasonId = null;
        this.resolvedAt = LocalDateTime.now();
        this.status = TicketStatus.REJECTED;
    }

    public void acceptResolutionByCustomer() {
        if (this.status != TicketStatus.RESOLVED) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_ACCEPT_RESOLUTION);
        }
        this.status = TicketStatus.CLOSED;
    }

    public void reopenAfterDissatisfaction(LocalDateTime newDueAt) {
        if (this.status != TicketStatus.RESOLVED) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_REOPEN_RESOLUTION);
        }
        this.status = TicketStatus.OPEN;
        this.assignedTo = null;
        this.dueAt = newDueAt;
        this.resolvedAt = null;
        this.response = null;
        this.resolvedReasonId = null;
    }

    public void autoCloseResolved() {
        if (this.status != TicketStatus.RESOLVED) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_AUTO_CLOSE);
        }
        this.status = TicketStatus.CLOSED;
    }

    public void markInProgressByStaff(UUID staffId) {
        assignByStaff(staffId);
    }

    private void ensureStatus(TicketStatus expectedStatus) {
        if (this.status != expectedStatus) {
            throw new DomainException(ErrorCode.TICKET_CANNOT_UPDATE);
        }
    }
}
