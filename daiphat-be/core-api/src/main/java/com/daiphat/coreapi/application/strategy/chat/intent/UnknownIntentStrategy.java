package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("UNKNOWN")
@RequiredArgsConstructor
public class UnknownIntentStrategy implements ChatIntentHandlerStrategy {

    private final ChatMessageProperties chatMessageProperties;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.UNKNOWN;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        return new ChatIntentOutcome.BotReply(
                chatMessageProperties.getNotUnderstood(),
                ChatIntent.UNKNOWN.name()
        );
    }
}
