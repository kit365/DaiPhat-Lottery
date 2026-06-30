package com.daiphat.coreapi.application.dto.request.chat;

import com.daiphat.coreapi.domain.model.enums.chat.AssigneeType;
import com.daiphat.coreapi.domain.model.enums.chat.ParticipationRole;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.UUID;

public record UpsertParticipationRequest(
        @NotNull(message = "Conversation ID không được để trống")
        Long conversationId,
        @NotNull(message = "User ID không được để trống")
        UUID userId,
        @NotNull(message = "Role không được để trống")
        ParticipationRole role,
        LocalDateTime lastReadAt,
        Boolean isActive,
        AssigneeType assigneeType,
        LocalDateTime joinedAt,
        LocalDateTime leftAt
) {
}
