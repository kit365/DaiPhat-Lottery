package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.response.chat.MessageResponse;
import com.daiphat.coreapi.application.dto.response.chat.StaffConversationContextResponse;
import com.daiphat.coreapi.domain.model.chat.ConversationModel;

import java.util.List;
import java.util.UUID;

public interface ChatStaffContextPort {

    StaffConversationContextResponse build(ConversationModel conversation);

    List<MessageResponse> getPreviousSessionMessages(UUID viewerId, Long conversationId);
}
