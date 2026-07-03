package com.daiphat.coreapi.application.strategy.chat;

import com.daiphat.coreapi.application.config.ChatAiProperties;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.out.ai.AiServiceClientPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AiBotResponseStrategy")
class AiBotResponseStrategyTest {

    private static final Long CONVERSATION_ID = 10L;

    @Mock
    private AiServiceClientPort aiServiceClientPort;
    @Mock
    private MessageRepositoryPort messageRepositoryPort;
    @Mock
    private ChatEscalationPort chatEscalationPort;
    @Mock
    private ChatAiMessagePort chatAiMessagePort;

    private ChatAiProperties chatAiProperties;
    private AiBotResponseStrategy strategy;

    @BeforeEach
    void setUp() {
        chatAiProperties = new ChatAiProperties();
        chatAiProperties.setConfidenceThreshold(0.7);
        chatAiProperties.setHandoffMessage("Handoff");
        chatAiProperties.setUnavailableMessage("Unavailable");
        chatAiProperties.setUnhandledIntentMessage("Unhandled");

        strategy = new AiBotResponseStrategy(
                aiServiceClientPort,
                messageRepositoryPort,
                chatAiProperties,
                chatEscalationPort,
                chatAiMessagePort
        );
    }

    @Test
    void handle_whenClassificationNull_escalatesAsAiUnavailable() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage();

        when(aiServiceClientPort.classifyMessage("hello", CONVERSATION_ID)).thenReturn(null);

        strategy.handle(conversation, customerMessage);

        verify(chatEscalationPort).escalateFromBot(
                conversation,
                EscalationReason.AI_SERVICE_UNAVAILABLE,
                "Unavailable"
        );
        verify(chatAiMessagePort, never()).saveAndPublish(any(), any(), any());
    }

    @Test
    void handle_whenLowConfidence_escalatesWithHandoffMessage() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage();

        when(aiServiceClientPort.classifyMessage("hello", CONVERSATION_ID)).thenReturn(
                ChatClassifyResponseDto.builder()
                        .intent("UNKNOWN")
                        .confidence(0.3)
                        .suggestedReply("Connecting you to staff")
                        .build()
        );
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        strategy.handle(conversation, customerMessage);

        verify(chatEscalationPort).escalateFromBot(
                conversation,
                EscalationReason.BOT_LOW_CONFIDENCE,
                "Connecting you to staff"
        );
    }

    @Test
    void handle_whenSuggestedReplyPresent_publishesAiReply() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage();

        when(aiServiceClientPort.classifyMessage("hello", CONVERSATION_ID)).thenReturn(
                ChatClassifyResponseDto.builder()
                        .intent("TRASH_TALK")
                        .confidence(0.9)
                        .suggestedReply("Xin chào!")
                        .build()
        );
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        strategy.handle(conversation, customerMessage);

        verify(chatAiMessagePort).saveAndPublish(conversation, "Xin chào!", 1L);
        verify(chatEscalationPort, never()).escalateFromBot(any(), any(), any());
    }

    @Test
    void handle_whenSuggestedReplyBlank_escalatesUnhandledIntent() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage();

        when(aiServiceClientPort.classifyMessage("hello", CONVERSATION_ID)).thenReturn(
                ChatClassifyResponseDto.builder()
                        .intent("WEB_RESULT")
                        .confidence(0.85)
                        .suggestedReply(null)
                        .build()
        );
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        strategy.handle(conversation, customerMessage);

        verify(chatEscalationPort).escalateFromBot(
                eq(conversation),
                eq(EscalationReason.BOT_LOW_CONFIDENCE),
                eq("Unhandled")
        );
    }

    private ConversationModel openConversation() {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support")
                .customerId(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .status(ConversationStatus.OPEN)
                .build();
    }

    private MessageModel customerMessage() {
        return MessageModel.builder()
                .id(1L)
                .conversationId(CONVERSATION_ID)
                .senderId(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .senderType(MessageSenderType.CUSTOMER)
                .content("hello")
                .build();
    }
}
