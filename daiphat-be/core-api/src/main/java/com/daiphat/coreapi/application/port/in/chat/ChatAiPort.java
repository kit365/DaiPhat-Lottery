package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;

public interface ChatAiPort {

    boolean isEnabled();

    ChatClassifyResponseDto classifyMessage(String message, Long conversationId);

    String generateFortuneReply(String message, Long conversationId);
}
