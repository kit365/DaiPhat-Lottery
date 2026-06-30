package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationModel {

    private Long id;
    private String title;

    @Builder.Default
    private ConversationStatus status = ConversationStatus.OPEN;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;
    private LocalDateTime deletedAt;

    public void initializeForCreate() {
        if (status == null) {
            status = ConversationStatus.OPEN;
        }
        normalizeTitle();
    }

    public void activate() {
        status = ConversationStatus.ACTIVE;
    }

    public void waitForOperator() {
        status = ConversationStatus.WAITING_FOR_OPERATOR;
    }

    public void waitForCustomer() {
        status = ConversationStatus.WAITING_FOR_CUSTOMER;
    }

    public void close() {
        status = ConversationStatus.CLOSED;
    }

    public void validate() {
        normalizeTitle();
        if (title == null || title.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Tiêu đề cuộc trò chuyện không được để trống.");
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete() {
        deletedAt = LocalDateTime.now();
    }

    private void normalizeTitle() {
        if (title != null) {
            title = title.trim();
        }
    }
}
