package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;
import com.daiphat.coreapi.application.event.ChatConversationEscalatedEvent;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationSocketEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventListener {

    private final ChatConversationEventPublisherPort chatConversationEventPublisherPort;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleChatConversationEscalated(ChatConversationEscalatedEvent event) {
        log.info("Handling ChatConversationEscalatedEvent for conversationId: {}", event.conversationId());

        ChatConversationSocketEvent socketEvent = ChatConversationSocketEvent.builder()
                .eventType(ConversationSocketEventType.CONVERSATION_ESCALATED)
                .conversationId(event.conversationId())
                .status(event.status())
                .assignedOperatorId(event.assignedOperatorId())
                .reason(event.reason())
                .customerLastReadAt(event.customerLastReadAt())
                .createdAt(event.occurredAt())
                .build();

        chatConversationEventPublisherPort.publishToOperators(socketEvent);
        chatConversationEventPublisherPort.publishToConversation(event.conversationId(), socketEvent);
        chatConversationEventPublisherPort.publishToCustomer(event.customerId(), socketEvent);
    }
}
