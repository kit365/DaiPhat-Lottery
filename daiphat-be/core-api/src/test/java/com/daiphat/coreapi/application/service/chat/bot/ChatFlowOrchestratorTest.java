package com.daiphat.coreapi.application.service.chat.bot;

import com.daiphat.coreapi.application.config.ChatFlowProperties;
import com.daiphat.coreapi.application.dto.chat.bot.ChatFlowHandleResult;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.application.port.in.chat.AiServiceConfigPort;
import com.daiphat.coreapi.application.port.in.chat.ChatFlowService;
import com.daiphat.coreapi.application.service.chat.intent.ChatIntentClassifier;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandlerStrategy;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ChatSchedulePendingSlot;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_ASK_LOCATION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChatFlowOrchestrator")
class ChatFlowOrchestratorTest {

    private static final Long CONVERSATION_ID = 10L;

    @Mock
    private ChatIntentClassifier classifier;
    @Mock
    private ChatFlowService scheduleFlowService;
    @Mock
    private ChatIntentHandlerStrategy accountIntentHandler;
    @Mock
    private ChatIntentHandlerStrategy unknownIntentHandler;
    @Mock
    private AiServiceConfigPort aiServiceConfigPort;

    private ChatFlowProperties chatFlowProperties;
    private ChatFlowOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        chatFlowProperties = new ChatFlowProperties();
        chatFlowProperties.setSwitchIntentThreshold(0.85);
        chatFlowProperties.setSlotFillMinConfidence(0.3);
        chatFlowProperties.setTtlMinutes(10);

        when(scheduleFlowService.flowIntent()).thenReturn(ChatIntent.WEB_SCHEDULE.name());
        when(accountIntentHandler.supportedIntent()).thenReturn(ChatIntent.WEB_ACCOUNT);
        when(unknownIntentHandler.supportedIntent()).thenReturn(ChatIntent.UNKNOWN);
        org.mockito.Mockito.lenient()
                .when(aiServiceConfigPort.switchIntentThreshold())
                .thenReturn(0.85);

        orchestrator = new ChatFlowOrchestrator(
                classifier,
                List.of(scheduleFlowService),
                List.of(accountIntentHandler, unknownIntentHandler),
                chatFlowProperties,
                aiServiceConfigPort
        );
    }

    @Test
    void handle_whenPendingScheduleFlow_continuesFlowService() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        MessageModel message = customerMessage("TP.HCM");
        PendingFlowState flow = conversation.latestFlow().orElseThrow();
        ChatClassifyResponseDto classification = classification(ChatIntent.WEB_SCHEDULE, 0.7);

        when(classifier.classify("TP.HCM", CONVERSATION_ID)).thenReturn(classification);
        when(scheduleFlowService.tryContinue(eq(conversation), eq(flow), eq(message), eq(classification)))
                .thenReturn(Optional.of(new ChatIntentOutcome.BotReply(TOKEN_ASK_LOCATION, ChatIntent.WEB_SCHEDULE.name())));

        ChatFlowHandleResult result = orchestrator.handle(conversation, message);

        assertThat(result.outcome()).isInstanceOf(ChatIntentOutcome.BotReply.class);
        verify(scheduleFlowService).tryContinue(eq(conversation), eq(flow), eq(message), eq(classification));
        verify(scheduleFlowService, never()).startFlow(any(), any(), any());
    }

    @Test
    void handle_whenHighConfidenceIntentSwitch_dispatchesNewIntent() {
        ConversationModel conversation = openConversation();
        conversation.setPendingIntent(ChatIntent.WEB_SCHEDULE.name());
        conversation.setPendingSlot(ChatSchedulePendingSlot.LOCATION);
        MessageModel message = customerMessage("cho em xem đơn hàng");
        ChatClassifyResponseDto classification = classification(ChatIntent.WEB_ACCOUNT, 0.92);

        when(classifier.classify("cho em xem đơn hàng", CONVERSATION_ID)).thenReturn(classification);
        when(accountIntentHandler.resolve(any())).thenReturn(
                new ChatIntentOutcome.BotReply("Đơn hàng của bạn", ChatIntent.WEB_ACCOUNT.name())
        );

        ChatFlowHandleResult result = orchestrator.handle(conversation, message);

        assertThat(((ChatIntentOutcome.BotReply) result.outcome()).content()).isEqualTo("Đơn hàng của bạn");
        verify(scheduleFlowService, never()).tryContinue(any(), any(), any(), any());
        verify(accountIntentHandler).resolve(any());
    }

    @Test
    void handle_whenSlotAnswerWithoutActiveFlow_resumesBeforeStartFlow() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("Tất cả");
        ChatClassifyResponseDto classification = classification(ChatIntent.WEB_SCHEDULE, 0.76);
        ChatIntentOutcome resumed = new ChatIntentOutcome.BotReply(
                ChatScheduleConstants.TOKEN_ASK_DATE_MODE,
                ChatIntent.WEB_SCHEDULE.name()
        );

        when(classifier.classify("Tất cả", CONVERSATION_ID)).thenReturn(classification);
        when(scheduleFlowService.tryResumeSlotAnswer(conversation, null, message, classification))
                .thenReturn(Optional.of(resumed));

        ChatFlowHandleResult result = orchestrator.handle(conversation, message);

        assertThat(result.outcome()).isSameAs(resumed);
        verify(scheduleFlowService).tryResumeSlotAnswer(conversation, null, message, classification);
        verify(scheduleFlowService, never()).startFlow(any(), any(), any());
    }

    @Test
    void handle_whenWebScheduleIntent_startsFlowService() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("lịch quay");
        ChatClassifyResponseDto classification = classification(ChatIntent.WEB_SCHEDULE, 0.88);

        when(classifier.classify("lịch quay", CONVERSATION_ID)).thenReturn(classification);
        when(scheduleFlowService.tryResumeSlotAnswer(conversation, null, message, classification))
                .thenReturn(Optional.empty());
        when(scheduleFlowService.startFlow(conversation, message, classification))
                .thenReturn(new ChatIntentOutcome.BotReply(TOKEN_ASK_LOCATION, ChatIntent.WEB_SCHEDULE.name()));

        ChatFlowHandleResult result = orchestrator.handle(conversation, message);

        assertThat(((ChatIntentOutcome.BotReply) result.outcome()).content()).isEqualTo(TOKEN_ASK_LOCATION);
        verify(scheduleFlowService).startFlow(conversation, message, classification);
    }

    @Test
    void handle_whenUnknownIntent_delegatesToHandler() {
        ConversationModel conversation = openConversation();
        MessageModel message = customerMessage("???");
        ChatClassifyResponseDto classification = classification(ChatIntent.UNKNOWN, 0.2);

        when(classifier.classify("???", CONVERSATION_ID)).thenReturn(classification);
        when(unknownIntentHandler.resolve(any())).thenReturn(
                new ChatIntentOutcome.BotReply("fallback", ChatIntent.UNKNOWN.name())
        );

        ChatFlowHandleResult result = orchestrator.handle(conversation, message);

        ArgumentCaptor<ChatIntentContext> contextCaptor = ArgumentCaptor.forClass(ChatIntentContext.class);
        verify(unknownIntentHandler).resolve(contextCaptor.capture());
        assertThat(contextCaptor.getValue().getClassification()).isSameAs(classification);
        assertThat(((ChatIntentOutcome.BotReply) result.outcome()).content()).isEqualTo("fallback");
    }

    private ConversationModel openConversation() {
        return ConversationModel.builder()
                .id(CONVERSATION_ID)
                .title("Support")
                .customerId(UUID.fromString("11111111-1111-1111-1111-111111111111"))
                .status(ConversationStatus.OPEN)
                .build();
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

    private ChatClassifyResponseDto classification(ChatIntent intent, double confidence) {
        return ChatClassifyResponseDto.builder()
                .intent(intent.name())
                .confidence(confidence)
                .build();
    }
}
