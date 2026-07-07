package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.chat.MessageModel;

public interface ChatBotPort {

    void processCustomerMessage(ConversationModel conversation, MessageModel customerMessage);
}
