package com.daiphat.coreapi.application.port.out.ai;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.chat.ChatGenerateResponse;

public interface AiConsultPort {

    ChatClassifyResponse classifyMessage(String message, Long conversationId);

    ChatGenerateResponse generateFortune(String message, Long conversationId);

    default String generateFortuneReply(String message, Long conversationId) {
        ChatGenerateResponse response = generateFortune(message, conversationId);
        return response != null ? response.getReply() : null;
    }
}
