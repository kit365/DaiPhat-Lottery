package com.daiphat.coreapi.application.service.chat.bot;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.dto.response.chat.ChatGenerateResponse;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.application.port.out.ai.AiConsultPort;
import org.springframework.stereotype.Service;

@Service
public class ChatAiService implements ChatAiPort {

    private final AiConsultPort aiConsultPort;
    private final AiServiceConfigPort aiServiceConfigPort;

    public ChatAiService(
            AiConsultPort aiConsultPort,
            AiServiceConfigPort aiServiceConfigPort
    ) {
        this.aiConsultPort = aiConsultPort;
        this.aiServiceConfigPort = aiServiceConfigPort;
    }

    @Override
    public boolean isEnabled() {
        return aiServiceConfigPort.isChatbotEnabled();
    }

    @Override
    public ChatClassifyResponse classifyMessage(String message, Long conversationId) {
        if (!isEnabled()) {
            return null;
        }
        return aiConsultPort.classifyMessage(message, conversationId);
    }

    @Override
    public ChatGenerateResponse generateFortune(String message, Long conversationId) {
        if (!isEnabled()) {
            return null;
        }
        return aiConsultPort.generateFortune(message, conversationId);
    }
}
