package com.daiphat.coreapi.application.service.chat;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;

public record ChatFlowHandleResult(
        ChatClassifyResponseDto classification,
        ChatIntentOutcome outcome
) {
}
