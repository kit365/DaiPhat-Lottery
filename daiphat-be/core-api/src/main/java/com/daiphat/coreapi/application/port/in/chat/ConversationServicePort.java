package com.daiphat.coreapi.application.port.in.chat;

import com.daiphat.coreapi.application.dto.request.chat.InitConversationRequest;
import com.daiphat.coreapi.application.dto.request.chat.SendChatMessageSocketRequest;
import com.daiphat.coreapi.application.dto.response.chat.ChatMessageSocketResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationDetailResponse;
import com.daiphat.coreapi.application.dto.response.chat.ConversationResponse;

import java.util.List;
import java.util.UUID;

public interface ConversationServicePort {

    ConversationDetailResponse initCustomerConversation(UUID userId, InitConversationRequest request);

    List<ConversationResponse> getMyConversations(UUID userId);

    List<ConversationResponse> getManagementConversations(UUID userId);

    ConversationDetailResponse getManagementConversationDetail(UUID userId, Long conversationId);

    ChatMessageSocketResponse sendMessage(UUID userId, SendChatMessageSocketRequest request);
}
