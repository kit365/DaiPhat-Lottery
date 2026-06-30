package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.chat.AssigneeType;
import com.daiphat.coreapi.domain.model.enums.chat.ParticipationRole;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipationModel {

    private Long id;
    private Long conversationId;
    private UUID userId;
    private ParticipationRole role;
    private LocalDateTime lastReadAt;

    @Builder.Default
    private boolean isActive = true;

    private AssigneeType assigneeType;
    private LocalDateTime joinedAt;
    private LocalDateTime leftAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void initializeForJoin() {
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
        if (assigneeType == null && role == ParticipationRole.OPERATOR) {
            assigneeType = AssigneeType.HUMAN_OPERATOR;
        }
    }

    public void markRead(LocalDateTime readAt) {
        lastReadAt = readAt != null ? readAt : LocalDateTime.now();
    }

    public void leave() {
        isActive = false;
        leftAt = LocalDateTime.now();
    }

    public void reactivate() {
        isActive = true;
        leftAt = null;
    }

    public void validate() {
        if (conversationId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu conversationId cho participant.");
        }
        if (userId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu userId cho participant.");
        }
        if (role == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu role cho participant.");
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete() {
        deletedAt = LocalDateTime.now();
    }
}
