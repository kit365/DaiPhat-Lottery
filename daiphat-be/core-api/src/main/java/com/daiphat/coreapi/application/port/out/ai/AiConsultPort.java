package com.daiphat.coreapi.application.port.out.ai;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;

public interface AiConsultPort {

    ChatClassifyResponseDto classifyMessage(String message, Long conversationId);

    String generateFortuneReply(String message, Long conversationId);
}
