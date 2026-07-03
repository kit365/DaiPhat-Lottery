package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.event.ChatConversationEscalatedEvent;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ChatEscalationService implements ChatEscalationPort {

    private final ConversationRepositoryPort conversationRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;
    private final ChatAiMessagePort chatAiMessagePort;

    @Override
    @Transactional
    public void escalateFromBot(ConversationModel conversation, EscalationReason reason, String handoffMessage) {
        if (conversation.getAssignedOperatorId() != null || conversation.getStatus() == ConversationStatus.CLOSED) {
            return;
        }

        if (handoffMessage != null && !handoffMessage.isBlank()) {
            if (reason == EscalationReason.AI_DISABLED) {
                // Stay in bot-only OPEN thread; gray system notice, no staff queue.
                chatAiMessagePort.saveSystemNoticeAndPublish(conversation, handoffMessage);
            } else {
                chatAiMessagePort.saveAndPublish(conversation, handoffMessage, null);
            }
        }

        if (!requiresOperatorQueue(reason)) {
            conversationRepositoryPort.save(conversation);
            return;
        }

        if (conversation.canEscalate()) {
            conversation.waitForOperator();
        }
        ConversationModel savedConversation = conversationRepositoryPort.save(conversation);
        publishEscalatedEvent(savedConversation, reason);
    }

    private boolean requiresOperatorQueue(EscalationReason reason) {
        return reason != EscalationReason.AI_DISABLED;
    }

    private void publishEscalatedEvent(ConversationModel conversation, EscalationReason reason) {
        eventPublisher.publishEvent(ChatConversationEscalatedEvent.builder()
                .conversationId(conversation.getId())
                .customerId(conversation.getCustomerId())
                .status(conversation.getStatus())
                .assignedOperatorId(conversation.getAssignedOperatorId())
                .reason(reason)
                .customerLastReadAt(conversation.getCustomerLastReadAt())
                .occurredAt(LocalDateTime.now())
                .build());
    }
}
