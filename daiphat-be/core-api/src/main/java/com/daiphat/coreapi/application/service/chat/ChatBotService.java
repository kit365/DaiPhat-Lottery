package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.in.chat.ChatBotPort;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowSessionPort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.strategy.chat.ChatAiMessages;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
public class ChatBotService implements ChatBotPort {

    private final ChatFlowOrchestrator chatFlowOrchestrator;
    private final ChatFlowSessionPort chatFlowSessionPort;
    private final ChatAiMessagePort chatAiMessagePort;
    private final ChatEscalationPort chatEscalationPort;
    private final MessageRepositoryPort messageRepositoryPort;
    private final ConversationRepositoryPort conversationRepositoryPort;

    public ChatBotService(
            ChatFlowOrchestrator chatFlowOrchestrator,
            ChatFlowSessionPort chatFlowSessionPort,
            ChatAiMessagePort chatAiMessagePort,
            ChatEscalationPort chatEscalationPort,
            MessageRepositoryPort messageRepositoryPort,
            ConversationRepositoryPort conversationRepositoryPort
    ) {
        this.chatFlowOrchestrator = chatFlowOrchestrator;
        this.chatFlowSessionPort = chatFlowSessionPort;
        this.chatAiMessagePort = chatAiMessagePort;
        this.chatEscalationPort = chatEscalationPort;
        this.messageRepositoryPort = messageRepositoryPort;
        this.conversationRepositoryPort = conversationRepositoryPort;
    }

    @Override
    public void processCustomerMessage(ConversationModel conversation, MessageModel customerMessage) {
        log.info("AI Bot handling message from conversation: {}", conversation.getId());

        chatFlowSessionPort.hydrate(conversation);
        ChatFlowHandleResult result = chatFlowOrchestrator.handle(conversation, customerMessage);

        if (result.classification() != null) {
            persistClassification(customerMessage, result.classification());
        }

        if (result.outcome() == null) {
            log.warn("AI Service unavailable or failed for conversation {}. Replying without escalation.", conversation.getId());
            chatAiMessagePort.saveBotReply(
                    conversation,
                    ChatAiMessages.UNAVAILABLE,
                    customerMessage.getId(),
                    ChatIntent.UNKNOWN.name()
            );
            chatFlowSessionPort.persist(conversation);
            return;
        }

        applyOutcome(conversation, customerMessage, result.outcome());
    }

    private void applyOutcome(
            ConversationModel conversation,
            MessageModel customerMessage,
            ChatIntentOutcome outcome
    ) {
        chatFlowSessionPort.persist(conversation);
        switch (outcome) {
            case ChatIntentOutcome.BotReply botReply -> {
                conversationRepositoryPort.save(conversation);
                chatAiMessagePort.saveBotReply(
                        conversation,
                        botReply.content(),
                        customerMessage.getId(),
                        botReply.intent()
                );
            }
            case ChatIntentOutcome.Escalate escalate -> {
                conversation.clearPendingFlow();
                conversationRepositoryPort.save(conversation);
                chatEscalationPort.escalateFromBot(
                        conversation,
                        escalate.reason(),
                        escalate.message()
                );
            }
            case null -> log.warn("Intent handler returned null outcome for conversation {}", conversation.getId());
        }
    }

    private void persistClassification(MessageModel customerMessage, ChatClassifyResponseDto classification) {
        customerMessage.setIntent(classification.getIntent());
        if (classification.getConfidence() != null) {
            customerMessage.setConfidence(BigDecimal.valueOf(classification.getConfidence()));
        }
        messageRepositoryPort.save(customerMessage);
    }
}
