package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;

public interface ChatAiPort {

    boolean isEnabled();

    ChatClassifyResponse classifyMessage(String message, Long conversationId);

    String generateFortuneReply(String message, Long conversationId);
}
