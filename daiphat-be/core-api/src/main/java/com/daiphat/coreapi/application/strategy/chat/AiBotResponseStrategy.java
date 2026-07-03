package com.daiphat.coreapi.application.strategy.chat;

import com.daiphat.coreapi.application.config.ChatAiProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.out.ai.AiServiceClientPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiBotResponseStrategy implements ChatResponseStrategy {

    private final AiServiceClientPort aiServiceClientPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final ChatAiProperties chatAiProperties;
    private final ChatEscalationPort chatEscalationPort;
    private final ChatAiMessagePort chatAiMessagePort;

    @Override
    public void handle(ConversationModel conversation, MessageModel customerMessage) {
        log.info("AI Bot handling message from conversation: {}", conversation.getId());

        ChatClassifyResponseDto classification = aiServiceClientPort.classifyMessage(
                customerMessage.getContent(),
                conversation.getId()
        );

        if (classification == null) {
            log.warn("AI Service unavailable or failed. Escalating conversation {}.", conversation.getId());
            chatEscalationPort.escalateFromBot(
                    conversation,
                    EscalationReason.AI_SERVICE_UNAVAILABLE,
                    chatAiProperties.getUnavailableMessage()
            );
            return;
        }

        persistClassification(customerMessage, classification);

        ChatIntent intent = ChatIntent.fromValue(classification.getIntent()).orElse(ChatIntent.UNKNOWN);
        double confidence = classification.getConfidence() != null ? classification.getConfidence() : 0.0;

        log.info("AI Classification result: Intent={}, Confidence={}", intent, confidence);

        if (intent.shouldEscalate() || confidence < chatAiProperties.getConfidenceThreshold()) {
            log.info("Escalating conversation {} due to low confidence or explicit request.", conversation.getId());
            chatEscalationPort.escalateFromBot(
                    conversation,
                    EscalationReason.BOT_LOW_CONFIDENCE,
                    resolveHandoffMessage(classification)
            );
            return;
        }

        String replyContent = classification.getSuggestedReply();
        if (replyContent == null || replyContent.isBlank()) {
            chatEscalationPort.escalateFromBot(
                    conversation,
                    EscalationReason.BOT_LOW_CONFIDENCE,
                    chatAiProperties.getUnhandledIntentMessage()
            );
            return;
        }

        chatAiMessagePort.saveAndPublish(conversation, replyContent, customerMessage.getId());
    }

    private void persistClassification(MessageModel customerMessage, ChatClassifyResponseDto classification) {
        customerMessage.setIntent(classification.getIntent());
        if (classification.getConfidence() != null) {
            customerMessage.setConfidence(BigDecimal.valueOf(classification.getConfidence()));
        }
        messageRepositoryPort.save(customerMessage);
    }

    private String resolveHandoffMessage(ChatClassifyResponseDto classification) {
        String reply = classification.getSuggestedReply();
        if (reply != null && !reply.isBlank()) {
            return reply;
        }
        return chatAiProperties.getHandoffMessage();
    }
}
