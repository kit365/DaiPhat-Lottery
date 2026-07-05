package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.application.port.out.ai.AiConsultPort;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ChatAiService implements ChatAiPort {

    private final AiConsultPort aiConsultPort;
    private final boolean enabled;

    public ChatAiService(
            AiConsultPort aiConsultPort,
            @Value("${daiphat.chat.ai.enabled:false}") boolean enabled
    ) {
        this.aiConsultPort = aiConsultPort;
        this.enabled = enabled;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public ChatClassifyResponseDto classifyMessage(String message, Long conversationId) {
        if (!isEnabled()) {
            return null;
        }
        return aiConsultPort.classifyMessage(message, conversationId);
    }

    @Override
    public String generateFortuneReply(String message, Long conversationId) {
        if (!isEnabled()) {
            return null;
        }
        return aiConsultPort.generateFortuneReply(message, conversationId);
    }
}
