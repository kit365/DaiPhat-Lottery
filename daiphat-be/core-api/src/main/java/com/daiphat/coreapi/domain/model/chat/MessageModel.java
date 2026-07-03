package com.daiphat.coreapi.domain.model.chat;

import com.daiphat.coreapi.domain.exception.DomainException;
import com.daiphat.coreapi.domain.exception.ErrorCode;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageModel {

    private Long id;
    private Long conversationId;
    private Long parentId;
    private UUID senderId;
    private MessageSenderType senderType;
    private String content;
    private String intent;
    private BigDecimal confidence;

    @Builder.Default
    private MessageType type = MessageType.TEXT;

    private String fileUrl;
    private String fileName;

    @Builder.Default
    private boolean isEdited = false;

    private LocalDateTime editedAt;

    @Builder.Default
    private boolean isRead = false;

    @Builder.Default
    private int readerCount = 0;

    @Builder.Default
    private boolean isDeleted = false;

    private LocalDateTime deletedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String lastModifiedBy;

    public void initializeForCreate() {
        if (type == null) {
            type = MessageType.TEXT;
        }
        normalizeFields();
    }

    public static MessageModel systemDivider(Long conversationId, String content) {
        MessageModel message = MessageModel.builder()
                .conversationId(conversationId)
                .senderType(MessageSenderType.AI_SYSTEM)
                .content(content)
                .type(MessageType.SYSTEM)
                .build();
        message.initializeForCreate();
        message.validate();
        return message;
    }

    public void markEdited(String nextContent, String nextFileUrl, String nextFileName) {
        content = normalize(nextContent);
        fileUrl = normalize(nextFileUrl);
        fileName = normalize(nextFileName);
        isEdited = true;
        editedAt = LocalDateTime.now();
    }

    public void markRead() {
        isRead = true;
        if (readerCount < 1) {
            readerCount = 1;
        }
    }

    public void incrementReaderCount() {
        readerCount++;
        isRead = true;
    }

    public void softDelete() {
        isDeleted = true;
        deletedAt = LocalDateTime.now();
    }

    public void validate() {
        normalizeFields();
        if (conversationId == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu conversationId cho tin nhắn.");
        }
        if (senderType == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu senderType cho tin nhắn.");
        }
        if (type == null) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Thiếu type cho tin nhắn.");
        }
        if ((content == null || content.isBlank()) && (fileUrl == null || fileUrl.isBlank())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Tin nhắn phải có nội dung hoặc tệp đính kèm.");
        }
        if (confidence != null && (confidence.compareTo(BigDecimal.ZERO) < 0 || confidence.compareTo(BigDecimal.ONE) > 0)) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Confidence phải nằm trong khoảng 0-1.");
        }
        if (type == MessageType.TEXT && fileUrl != null && !fileUrl.isBlank()) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Tin nhắn text không được có fileUrl.");
        }
        if ((type == MessageType.IMAGE || type == MessageType.FILE) && (fileUrl == null || fileUrl.isBlank())) {
            throw new DomainException(ErrorCode.INVALID_INPUT, "Tin nhắn đính kèm phải có fileUrl.");
        }
    }

    private void normalizeFields() {
        content = normalize(content);
        intent = normalize(intent);
        fileUrl = normalize(fileUrl);
        fileName = normalize(fileName);
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
