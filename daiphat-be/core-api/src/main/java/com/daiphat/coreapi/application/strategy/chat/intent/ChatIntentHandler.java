package com.daiphat.coreapi.application.strategy.chat.intent;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentContext;
import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.domain.model.enums.chat.ChatIntent;

public interface ChatIntentHandler {

    ChatIntent supportedIntent();

    ChatIntentOutcome resolve(ChatIntentContext ctx);
}
