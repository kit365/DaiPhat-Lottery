package com.daiphat.coreapi.application.dto.request.chat;

import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record CreateConversationRequest(
        @NotBlank(message = "Tiêu đề cuộc trò chuyện không được để trống")
        @Size(max = 200, message = "Tiêu đề cuộc trò chuyện tối đa 200 ký tự")
        String title,
        ConversationStatus status
) {
}
