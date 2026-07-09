package com.daiphat.coreapi.application.service.chat.intent.classifier;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.in.chat.ChatAiPort;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ChatIntentClassifier {

    private final JavaKeywordIntentClassifier javaKeywordIntentClassifier;
    private final ChatAiPort chatAiPort;
    private final AiServiceConfigPort aiServiceConfigPort;
    private final double confidenceThreshold;

    public ChatIntentClassifier(
            JavaKeywordIntentClassifier javaKeywordIntentClassifier,
            ChatAiPort chatAiPort,
            AiServiceConfigPort aiServiceConfigPort,
            @Value("${daiphat.chat.ai.confidence-threshold}") double confidenceThreshold
    ) {
        this.javaKeywordIntentClassifier = javaKeywordIntentClassifier;
        this.chatAiPort = chatAiPort;
        this.aiServiceConfigPort = aiServiceConfigPort;
        this.confidenceThreshold = confidenceThreshold;
    }

    public ChatClassifyResponse classify(String message, Long conversationId) {
        ChatClassifyResponse javaResult = javaKeywordIntentClassifier.classify(message);
        if (shouldUseJavaResult(javaResult)) {
            log.debug("Using Java keyword classification: intent={}", javaResult.getIntent());
            return javaResult;
        }

        if (!chatAiPort.isEnabled()) {
            log.debug("Chat AI is disabled; skipping Python classify fallback.");
            return javaResult;
        }

        log.debug("Java classification uncertain; falling back to Python AI service.");
        ChatClassifyResponse pythonResult = chatAiPort.classifyMessage(message, conversationId);
        if (pythonResult != null) {
            return pythonResult;
        }

        return null;
    }

    private boolean shouldUseJavaResult(ChatClassifyResponse result) {
        if (result == null) {
            return false;
        }
        ChatIntent intent = ChatIntent.fromValue(result.getIntent()).orElse(ChatIntent.UNKNOWN);
        if (intent == ChatIntent.UNKNOWN) {
            return false;
        }
        if (!aiServiceConfigPort.isIntentEnabled(intent)) {
            return false;
        }
        double confidence = result.getConfidence() != null ? result.getConfidence() : 0.0;
        return confidence >= confidenceThreshold;
    }
}
