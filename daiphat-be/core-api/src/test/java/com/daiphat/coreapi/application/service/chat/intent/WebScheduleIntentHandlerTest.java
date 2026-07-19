package com.daiphat.coreapi.application.service.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.application.service.chat.flow.schedule.DrawScheduleFlowService;
import com.daiphat.coreapi.application.strategy.chat.intent.WebScheduleIntentStrategy;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.ConversationStatus;
import com.daiphat.coreapi.domain.model.enums.chat.MessageSenderType;
import com.daiphat.coreapi.domain.model.enums.lottery.LotteryRegionCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.ENTITY_REGION;
import static com.daiphat.coreapi.application.constant.chat.schedule.ChatScheduleConstants.TOKEN_ASK_LOCATION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WebScheduleIntentStrategy")
class WebScheduleIntentHandlerTest {

    @Mock
    private DrawScheduleFlowService drawScheduleFlowService;

    private WebScheduleIntentStrategy handler;

    @BeforeEach
    void setUp() {
        handler = new WebScheduleIntentStrategy(drawScheduleFlowService);
    }

    @Test
    void resolve_delegatesToDrawScheduleFlowService() {
        ConversationModel conversation = conversation();
        MessageModel customerMessage = customerMessage("lịch quay");
        ChatClassifyResponse classification = ChatClassifyResponse.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(0.75)
                .entities(Map.of())
                .build();
        ChatIntentContext context = ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(customerMessage)
                .classification(classification)
                .build();

        when(drawScheduleFlowService.startFlow(conversation, customerMessage, classification))
                .thenReturn(new ChatIntentOutcome.BotReply(TOKEN_ASK_LOCATION, ChatIntent.WEB_SCHEDULE.name()));

        ChatIntentOutcome outcome = handler.resolve(context);

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        assertThat(((ChatIntentOutcome.BotReply) outcome).content()).isEqualTo(TOKEN_ASK_LOCATION);
        verify(drawScheduleFlowService).startFlow(conversation, customerMessage, classification);
    }

    @Test
    void resolve_withRegionEntity_passesClassificationThrough() {
        ConversationModel conversation = conversation();
        MessageModel customerMessage = customerMessage("miền nam");
        ChatClassifyResponse classification = ChatClassifyResponse.builder()
                .intent(ChatIntent.WEB_SCHEDULE.name())
                .confidence(0.88)
                .entities(Map.of(ENTITY_REGION, LotteryRegionCode.MIEN_NAM.code()))
                .build();

        when(drawScheduleFlowService.startFlow(any(), any(), any()))
                .thenReturn(new ChatIntentOutcome.BotReply(TOKEN_ASK_LOCATION, ChatIntent.WEB_SCHEDULE.name()));

        handler.resolve(ChatIntentContext.builder()
                .conversation(conversation)
                .customerMessage(customerMessage)
                .classification(classification)
                .build());

        verify(drawScheduleFlowService).startFlow(conversation, customerMessage, classification);
    }

    private ConversationModel conversation() {
        return ConversationModel.builder()
                .id(10L)
                .customerId(UUID.randomUUID())
                .status(ConversationStatus.OPEN)
                .build();
    }

    private MessageModel customerMessage(String content) {
        return MessageModel.builder()
                .id(1L)
                .conversationId(10L)
                .senderType(MessageSenderType.CUSTOMER)
                .content(content)
                .build();
    }
}
