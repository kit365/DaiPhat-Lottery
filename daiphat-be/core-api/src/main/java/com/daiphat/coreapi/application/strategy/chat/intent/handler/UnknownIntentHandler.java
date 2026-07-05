package com.daiphat.coreapi.application.strategy.chat.intent.handler;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandler;

import com.daiphat.coreapi.application.strategy.chat.ChatAiMessages;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import org.springframework.stereotype.Component;

@Component("UNKNOWN")
public class UnknownIntentHandler implements ChatIntentHandler {

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.UNKNOWN;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        return new ChatIntentOutcome.BotReply(
                ChatAiMessages.NOT_UNDERSTOOD,
                ChatIntent.UNKNOWN.name()
        );
    }
}
