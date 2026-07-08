package com.daiphat.coreapi.application.service.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.constant.chat.bot.ChatAiMessages;
import com.daiphat.coreapi.application.strategy.chat.intent.UnknownIntentStrategy;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UnknownIntentStrategy")
class UnknownIntentHandlerTest {

    private final UnknownIntentStrategy handler = new UnknownIntentStrategy();

    @Test
    void resolve_doesNotEscalate() {
        ChatIntentOutcome outcome = handler.resolve(ChatIntentContext.builder()
                .conversation(ConversationModel.builder().id(1L).build())
                .customerMessage(MessageModel.builder().content("xyz").build())
                .build());

        assertThat(outcome).isInstanceOf(ChatIntentOutcome.BotReply.class);
        ChatIntentOutcome.BotReply reply = (ChatIntentOutcome.BotReply) outcome;
        assertThat(reply.content()).isEqualTo(ChatAiMessages.NOT_UNDERSTOOD);
        assertThat(reply.intent()).isEqualTo(ChatIntent.UNKNOWN.name());
    }
}
