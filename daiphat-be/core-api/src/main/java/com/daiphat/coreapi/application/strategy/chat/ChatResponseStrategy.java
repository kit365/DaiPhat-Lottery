package com.daiphat.coreapi.application.strategy.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;

public interface ChatResponseStrategy {
    void handle(ConversationModel conversation, MessageModel customerMessage);
}
