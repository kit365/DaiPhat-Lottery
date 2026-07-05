package com.daiphat.coreapi.application.dto.chat.intent;

import com.daiphat.coreapi.application.dto.response.chat.ChatClassifyResponseDto;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatIntentContext {

    private final ConversationModel conversation;
    private final MessageModel customerMessage;
    private final ChatClassifyResponseDto classification;
}
