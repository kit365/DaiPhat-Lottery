package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.chat.intent.ChatIntentOutcome;
import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponse;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import com.daiphat.coreapi.domain.model.chat.PendingFlowState;

import java.util.Optional;

public interface ChatFlowService {

    String flowIntent();

    Optional<ChatIntentOutcome> tryResumeSlotAnswer(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel message,
            ChatClassifyResponse classification
    );

    ChatIntentOutcome startFlow(
            ConversationModel conversation,
            MessageModel message,
            ChatClassifyResponse classification
    );

    Optional<ChatIntentOutcome> tryContinue(
            ConversationModel conversation,
            PendingFlowState flow,
            MessageModel message,
            ChatClassifyResponse classification
    );
}
