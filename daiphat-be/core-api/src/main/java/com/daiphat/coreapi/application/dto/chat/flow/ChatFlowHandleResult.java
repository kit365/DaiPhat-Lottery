package com.daiphat.coreapi.application.dto.chat.flow;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;

public record ChatFlowHandleResult(
        ChatClassifyResponse classification,
        ChatIntentOutcome outcome
) {
}
