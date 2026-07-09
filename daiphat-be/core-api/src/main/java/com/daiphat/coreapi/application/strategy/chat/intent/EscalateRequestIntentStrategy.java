package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.config.ChatMessageProperties;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("ESCALATE_REQUEST")
@RequiredArgsConstructor
public class EscalateRequestIntentStrategy implements ChatIntentHandlerStrategy {

    private final ChatMessageProperties chatMessageProperties;

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.ESCALATE_REQUEST;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        return new ChatIntentOutcome.Escalate(
                EscalationReason.CUSTOMER_REQUEST,
                chatMessageProperties.getHandoff()
        );
    }
}
