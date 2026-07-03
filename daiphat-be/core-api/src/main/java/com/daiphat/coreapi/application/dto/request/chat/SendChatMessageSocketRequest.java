package com.daiphat.coreapi.application.dto.request.chat;

import com.daiphat.coreapi.domain.model.enums.chat.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

@Builder
public record SendChatMessageSocketRequest(
        @NotNull(message = "conversationId không được để trống")
        Long conversationId,

        Long parentId,

        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        String content,

        MessageType type
) {
}
