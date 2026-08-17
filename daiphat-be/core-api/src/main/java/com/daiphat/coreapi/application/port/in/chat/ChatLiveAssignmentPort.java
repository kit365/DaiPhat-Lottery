package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.domain.model.chat.ConversationModel;

import java.util.Optional;
import java.util.UUID;

public interface ChatLiveAssignmentPort {

    ConversationModel assignWaitingConversationToOperator(ConversationModel conversation, UUID operatorId);

    Optional<ConversationModel> tryDispatchNextForFreedOperator(UUID operatorId, Long excludeConversationId);

    Optional<ConversationModel> tryAssignIdleOnlineOperator(ConversationModel waitingConversation);
}
