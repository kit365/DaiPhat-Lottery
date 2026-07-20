package com.daiphat.coreapi.application.event;

import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import lombok.Builder;

import java.util.UUID;

@Builder
public record SupportTicketCommentAddedEvent(
        Long ticketId,
        String title,
        String categoryName,
        UUID customerId,
        UUID assignedTo,
        TicketCommentSenderRole senderRole
) {
}
