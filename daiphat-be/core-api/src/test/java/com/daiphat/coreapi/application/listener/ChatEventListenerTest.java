package com.daiphat.coreapi.application.listener;

import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;
import com.daiphat.coreapi.application.event.ChatConversationEscalatedEvent;
import com.daiphat.coreapi.application.port.out.chat.ChatConversationEventPublisherPort;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationSocketEventType;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatEventListener")
class ChatEventListenerTest {

    private static final Long CONVERSATION_ID = 10L;
    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private ChatConversationEventPublisherPort chatConversationEventPublisherPort;

    private ChatEventListener chatEventListener;

    @BeforeEach
    void setUp() {
        chatEventListener = new ChatEventListener(chatConversationEventPublisherPort);
    }

    @Test
    void handleChatConversationEscalated_publishesSocketEventToAllChannels() {
        LocalDateTime occurredAt = LocalDateTime.of(2026, 7, 4, 10, 0);
        ChatConversationEscalatedEvent event = ChatConversationEscalatedEvent.builder()
                .conversationId(CONVERSATION_ID)
                .customerId(CUSTOMER_ID)
                .status(ConversationStatus.WAITING_FOR_OPERATOR)
                .assignedOperatorId(null)
                .reason(EscalationReason.CUSTOMER_REQUEST)
                .customerLastReadAt(occurredAt.minusMinutes(1))
                .occurredAt(occurredAt)
                .build();

        chatEventListener.handleChatConversationEscalated(event);

        ArgumentCaptor<ChatConversationSocketEvent> socketCaptor =
                ArgumentCaptor.forClass(ChatConversationSocketEvent.class);
        verify(chatConversationEventPublisherPort).publishToOperators(socketCaptor.capture());
        verify(chatConversationEventPublisherPort).publishToConversation(eq(CONVERSATION_ID), any());
        verify(chatConversationEventPublisherPort).publishToCustomer(eq(CUSTOMER_ID), any());

        ChatConversationSocketEvent socketEvent = socketCaptor.getValue();
        assertThat(socketEvent.eventType()).isEqualTo(ConversationSocketEventType.CONVERSATION_ESCALATED);
        assertThat(socketEvent.reason()).isEqualTo(EscalationReason.CUSTOMER_REQUEST);
        assertThat(socketEvent.status()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
    }
}
