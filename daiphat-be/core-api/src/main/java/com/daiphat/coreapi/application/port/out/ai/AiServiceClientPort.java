package com.daiphat.coreapi.application.port.out.ai;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;

public interface AiServiceClientPort {
    ChatClassifyResponseDto classifyMessage(String message, Long conversationId);
}
