package com.daiphat.coreapi.application.port.out.chat;

import com.daiphat.coreapi.application.dto.response.chat.ChatConversationSocketEvent;

import java.util.UUID;

public interface ChatConversationEventPublisherPort {

    void publishToOperators(ChatConversationSocketEvent event);

    void publishToConversation(Long conversationId, ChatConversationSocketEvent event);

    void publishToCustomer(UUID customerId, ChatConversationSocketEvent event);
}
