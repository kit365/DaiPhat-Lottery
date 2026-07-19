package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.chat.ChatGenerateResponse;

public interface ChatAiPort {

    boolean isEnabled();

    ChatClassifyResponse classifyMessage(String message, Long conversationId);

    /**
     * Dream / feng-shui consult. Prefer {@link #generateFortune} which also returns lucky numbers.
     */
    default String generateFortuneReply(String message, Long conversationId) {
        ChatGenerateResponse response = generateFortune(message, conversationId);
        return response != null ? response.getReply() : null;
    }

    ChatGenerateResponse generateFortune(String message, Long conversationId);
}
