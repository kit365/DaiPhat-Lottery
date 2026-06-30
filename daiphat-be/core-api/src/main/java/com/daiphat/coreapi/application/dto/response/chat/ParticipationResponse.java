package com.daiphat.coreapi.application.dto.response.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AssigneeType;
import com.daiphat.coreapi.domain.model.enums.chat.ParticipationRole;
import lombok.Builder;

import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record ParticipationResponse(
        Long id,
        Long conversationId,
        UUID userId,
        ParticipationRole role,
        LocalDateTime lastReadAt,
        boolean isActive,
        AssigneeType assigneeType,
        LocalDateTime joinedAt,
        LocalDateTime leftAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime deletedAt
) {
}
