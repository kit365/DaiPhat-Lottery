package com.daiphat.coreapi.application.dto.request.chat;

import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateMessageRequest(
        @NotNull(message = "Conversation ID không được để trống")
        Long conversationId,
        Long parentId,
        UUID senderId,
        @NotNull(message = "Sender type không được để trống")
        MessageSenderType senderType,
        @Size(max = 4000, message = "Nội dung tin nhắn tối đa 4000 ký tự")
        String content,
        @Size(max = 100, message = "Intent tối đa 100 ký tự")
        String intent,
        @DecimalMin(value = "0.0", message = "Confidence phải lớn hơn hoặc bằng 0")
        @DecimalMax(value = "1.0", message = "Confidence phải nhỏ hơn hoặc bằng 1")
        BigDecimal confidence,
        MessageType type,
        @Size(max = 500, message = "File URL tối đa 500 ký tự")
        String fileUrl,
        @Size(max = 255, message = "Tên file tối đa 255 ký tự")
        String fileName
) {
}
