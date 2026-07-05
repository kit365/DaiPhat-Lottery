package com.daiphat.coreapi.application.strategy.chat.intent.handler;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.strategy.chat.intent.ChatIntentHandler;

import com.daiphat.coreapi.application.strategy.chat.ChatAiMessages;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;
import org.springframework.stereotype.Component;

@Component("ESCALATE_REQUEST")
public class EscalateRequestIntentHandler implements ChatIntentHandler {

    @Override
    public ChatIntent supportedIntent() {
        return ChatIntent.ESCALATE_REQUEST;
    }

    @Override
    public ChatIntentOutcome resolve(ChatIntentContext ctx) {
        return new ChatIntentOutcome.Escalate(
                EscalationReason.CUSTOMER_REQUEST,
                ChatAiMessages.HANDOFF
        );
    }
}
