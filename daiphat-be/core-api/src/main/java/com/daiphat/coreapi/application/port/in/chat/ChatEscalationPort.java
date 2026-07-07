package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;
import com.daiphat.coreapi.domain.model.enums.chat.EscalationReason;

public interface ChatEscalationPort {

    void escalateFromBot(ConversationModel conversation, EscalationReason reason, String handoffMessage);
}
