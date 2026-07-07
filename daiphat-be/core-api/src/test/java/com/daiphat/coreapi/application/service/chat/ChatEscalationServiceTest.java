package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.event.ChatConversationEscalatedEvent;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatEscalationService")
class ChatEscalationServiceTest {

    private static final Long CONVERSATION_ID = 10L;
    private static final UUID OPERATOR_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @Mock
    private ConversationRepositoryPort conversationRepositoryPort;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private ChatAiMessagePort chatAiMessagePort;

    private ChatEscalationService chatEscalationService;

    @BeforeEach
    void setUp() {
        chatEscalationService = new ChatEscalationService(
                conversationRepositoryPort,
                eventPublisher,
                chatAiMessagePort
        );
    }

    @Test
    void escalateFromBot_whenOperatorOnline_movesToWaitingPoolWithoutAutoAssign() {
        ConversationModel conversation = conversation(ConversationStatus.OPEN);

        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        chatEscalationService.escalateFromBot(
                conversation,
                EscalationReason.BOT_LOW_CONFIDENCE,
                "Đang kết nối nhân viên..."
        );

        assertThat(conversation.getAssignedOperatorId()).isNull();
        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
        verify(chatAiMessagePort).saveAndPublish(conversation, "Đang kết nối nhân viên...", null);

        ArgumentCaptor<ChatConversationEscalatedEvent> eventCaptor =
                ArgumentCaptor.forClass(ChatConversationEscalatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().conversationId()).isEqualTo(CONVERSATION_ID);
        assertThat(eventCaptor.getValue().reason()).isEqualTo(EscalationReason.BOT_LOW_CONFIDENCE);
    }

    @Test
    void escalateFromBot_whenNoOperatorOnline_movesToWaitingPoolWithHandoffMessage() {
        ConversationModel conversation = conversation(ConversationStatus.OPEN);

        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        chatEscalationService.escalateFromBot(
                conversation,
                EscalationReason.AI_SERVICE_UNAVAILABLE,
                "Đang kết nối nhân viên..."
        );

        assertThat(conversation.getAssignedOperatorId()).isNull();
        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.WAITING_FOR_OPERATOR);
        verify(chatAiMessagePort).saveAndPublish(conversation, "Đang kết nối nhân viên...", null);
        verify(chatAiMessagePort, org.mockito.Mockito.times(1)).saveAndPublish(any(), any(), any());

        ArgumentCaptor<ChatConversationEscalatedEvent> eventCaptor =
                ArgumentCaptor.forClass(ChatConversationEscalatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertThat(eventCaptor.getValue().reason()).isEqualTo(EscalationReason.AI_SERVICE_UNAVAILABLE);
    }

    @Test
    void escalateFromBot_whenAiDisabledAndNoOperator_staysOpenAndNotifiesCustomer() {
        ConversationModel conversation = conversation(ConversationStatus.OPEN);

        when(conversationRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        chatEscalationService.escalateFromBot(
                conversation,
                EscalationReason.AI_DISABLED,
                "AI disabled"
        );

        assertThat(conversation.getStatus()).isEqualTo(ConversationStatus.OPEN);
        assertThat(conversation.getAssignedOperatorId()).isNull();
        verify(chatAiMessagePort).saveSystemNoticeAndPublish(conversation, "AI disabled");
        verify(chatAiMessagePort, never()).saveAndPublish(any(), any(), any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void escalateFromBot_whenAlreadyAssigned_isNoOp() {
        ConversationModel conversation = conversation(ConversationStatus.ACTIVE);
        conversation.setAssignedOperatorId(OPERATOR_ID);

        chatEscalationService.escalateFromBot(
                conversation,
                EscalationReason.BOT_LOW_CONFIDENCE,
                "ignored"
        );

        verify(chatAiMessagePort, never()).saveAndPublish(any(), any(), any());
        verify(conversationRepositoryPort, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    private ConversationModel conversation(ConversationStatus status) {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support")
                .customerId(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .status(status)
                .build();
    }
}
