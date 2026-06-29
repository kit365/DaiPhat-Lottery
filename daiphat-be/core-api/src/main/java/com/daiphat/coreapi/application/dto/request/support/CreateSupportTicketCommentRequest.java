package com.daiphat.coreapi.application.dto.request.support;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateSupportTicketCommentRequest(
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 2000, message = "Nội dung tin nhắn tối đa 2000 ký tự")
        String content
) {
}
