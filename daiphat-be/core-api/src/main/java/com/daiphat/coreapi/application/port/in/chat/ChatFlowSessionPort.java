package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;

public interface ChatFlowSessionPort {

    void hydrate(ConversationModel conversation);

    void persist(ConversationModel conversation);
}
