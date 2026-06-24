package com.daiphat.coreapi.domain.model.support;

import com.daiphat.coreapi.domain.model.enums.support.TicketCommentSenderRole;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupportTicketCommentModel {

    private Long id;
    private Long supportTicketId;
    private UUID senderId;
    private TicketCommentSenderRole senderRole;
    private String content;
    private String attachmentUrl;
    private LocalDateTime createdAt;
}
