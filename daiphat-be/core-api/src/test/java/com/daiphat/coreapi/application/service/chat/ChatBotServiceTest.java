package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.ChatAiMessagePort;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowSessionPort;
import com.daiphat.coreapi.application.port.in.chat.ChatEscalationPort;
import com.daiphat.coreapi.application.port.out.chat.ConversationRepositoryPort;
import com.daiphat.coreapi.application.port.out.chat.MessageRepositoryPort;
import com.daiphat.coreapi.application.strategy.chat.ChatAiMessages;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_ASK_LOCATION;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_RESULT_PREFIX;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.RESULT_PARAM_DATE;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.RESULT_PARAM_STATION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatBotService")
class ChatBotServiceTest {

    private static final Long CONVERSATION_ID = 10L;

    @Mock
    private ChatFlowOrchestrator chatFlowOrchestrator;
    @Mock
    private ChatFlowSessionPort chatFlowSessionPort;
    @Mock
    private MessageRepositoryPort messageRepositoryPort;
    @Mock
    private ConversationRepositoryPort conversationRepositoryPort;
    @Mock
    private ChatEscalationPort chatEscalationPort;
    @Mock
    private ChatAiMessagePort chatAiMessagePort;

    private ChatBotService chatBotService;

    @BeforeEach
    void setUp() {
        chatBotService = new ChatBotService(
                chatFlowOrchestrator,
                chatFlowSessionPort,
                chatAiMessagePort,
                chatEscalationPort,
                messageRepositoryPort,
                conversationRepositoryPort
        );
    }

    @Test
    void processCustomerMessage_whenOrchestratorReturnsOutcome_savesBotReply() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage("TP.HCM");
        ChatClassifyResponseDto classification = ChatClassifyResponseDto.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(0.85)
                .build();
        ChatIntentOutcome.BotReply botReply = new ChatIntentOutcome.BotReply(
                TOKEN_RESULT_PREFIX + RESULT_PARAM_STATION + "=1:" + RESULT_PARAM_DATE + "=2026-07-04",
                ChatIntent.WEB_SCHEDULE.name()
        );

        when(chatFlowOrchestrator.handle(conversation, customerMessage))
                .thenReturn(new ChatFlowHandleResult(classification, botReply));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepositoryPort.save(conversation)).thenReturn(conversation);

        chatBotService.processCustomerMessage(conversation, customerMessage);

        verify(conversationRepositoryPort).save(conversation);
        verify(chatFlowSessionPort).hydrate(conversation);
        verify(chatFlowSessionPort).persist(conversation);
        verify(chatAiMessagePort).saveBotReply(
                conversation,
                botReply.content(),
                customerMessage.getId(),
                ChatIntent.WEB_SCHEDULE.name()
        );
    }

    @Test
    void processCustomerMessage_whenClassificationNull_repliesWithoutEscalation() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage();

        when(chatFlowOrchestrator.handle(conversation, customerMessage))
                .thenReturn(new ChatFlowHandleResult(null, null));

        chatBotService.processCustomerMessage(conversation, customerMessage);

        verify(chatFlowSessionPort).hydrate(conversation);
        verify(chatFlowSessionPort).persist(conversation);
        verify(chatAiMessagePort).saveBotReply(
                conversation,
                ChatAiMessages.UNAVAILABLE,
                customerMessage.getId(),
                ChatIntent.UNKNOWN.name()
        );
        verify(chatEscalationPort, never()).escalateFromBot(any(), any(), any());
    }

    @Test
    void processCustomerMessage_whenEscalateOutcome_escalatesAndClearsFlows() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        MessageModel customerMessage = customerMessage("gặp nhân viên");
        ChatClassifyResponseDto classification = ChatClassifyResponseDto.builder()
                .intent(ChatIntent.ESCALATE_REQUEST.name())
                .confidence(0.95)
                .build();

        when(chatFlowOrchestrator.handle(conversation, customerMessage))
                .thenReturn(new ChatFlowHandleResult(
                        classification,
                        new ChatIntentOutcome.Escalate(
                                EscalationReason.CUSTOMER_REQUEST,
                                "Đang chuyển bạn sang nhân viên"
                        )
                ));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepositoryPort.save(conversation)).thenReturn(conversation);

        chatBotService.processCustomerMessage(conversation, customerMessage);

        verify(chatEscalationPort).escalateFromBot(
                conversation,
                EscalationReason.CUSTOMER_REQUEST,
                "Đang chuyển bạn sang nhân viên"
        );
        verify(chatFlowSessionPort).hydrate(conversation);
        verify(chatFlowSessionPort).persist(conversation);
        assertThat(conversation.getActiveFlows()).isEmpty();
    }

    @Test
    void processCustomerMessage_persistsClassificationOnCustomerMessage() {
        ConversationModel conversation = openConversation();
        MessageModel customerMessage = customerMessage("lịch quay");
        ChatClassifyResponseDto classification = ChatClassifyResponseDto.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(0.75)
                .build();

        when(chatFlowOrchestrator.handle(conversation, customerMessage))
                .thenReturn(new ChatFlowHandleResult(
                        classification,
                        new ChatIntentOutcome.BotReply(TOKEN_ASK_LOCATION, ChatIntent.WEB_SCHEDULE.name())
                ));
        when(messageRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(conversationRepositoryPort.save(conversation)).thenReturn(conversation);

        chatBotService.processCustomerMessage(conversation, customerMessage);

        assertThat(customerMessage.getIntent()).isEqualTo(ChatIntent.WEB_SCHEDULE.name());
        assertThat(customerMessage.getConfidence()).isNotNull();
        verify(messageRepositoryPort).save(customerMessage);
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
        return customerMessage("hello");
    }

    private MessageModel customerMessage(String content) {
        return MessageModel.builder()
                .id(1L)
                .conversationId(CONVERSATION_ID)
                .senderId(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .senderType(MessageSenderType.CUSTOMER)
                .content(content)
                .build();
    }
}
