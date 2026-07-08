package com.daiphat.coreapi.application.dto.request.chat;

import jakarta.validation.constraints.Size;

public record UpdateMessageRequest(
        @Size(max = 4000, message = "Nội dung tin nhắn tối đa 4000 ký tự")
        String content,
        @Size(max = 500, message = "File URL tối đa 500 ký tự")
        String fileUrl,
        @Size(max = 255, message = "Tên file tối đa 255 ký tự")
        String fileName
) {
}
